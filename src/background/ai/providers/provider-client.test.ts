import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyProviderFailure, complete, discoverModels, ProviderError } from './provider-client';

const storage = new Map<string, unknown>();
const models = () =>
  Response.json({
    models: [
      { name: 'models/gemma-fixture', displayName: 'Gemma 4 26B', supportedGenerationMethods: ['generateContent'] },
    ],
  });
const failed = (status: number, error: unknown) => new Response(JSON.stringify({ error }), { status });

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: storage.get(key) }),
        set: async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) storage.set(key, value);
        },
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('provider errors', () => {
  it('uses the Gemini API-key header for generation too', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('gemini-secret');
      expect(new Headers(init?.headers).get('authorization')).toBeNull();
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }));
    });
    vi.stubGlobal('fetch', fetcher);

    await expect(complete('gemini', 'gemini-secret', 'gemini-writing', 'Return JSON')).resolves.toBe('{"ok":true}');
  });

  it('does not classify malicious reason text or 404 as key failures', async () => {
    expect(classifyProviderFailure(400, 'INVALID_ARGUMENT', 'API key is not valid.')).toMatchObject({ kind: 'other' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => failed(400, { code: 400, status: 'INVALID_ARGUMENT', message: 'API key is not valid.' })),
    );
    await expect(discoverModels('gemini', 'secret')).rejects.toMatchObject({ kind: 'other', status: 400 });
    expect(classifyProviderFailure(404, 'NOT_FOUND', 'missing').kind).toBe('other');
  });

  it('recognizes Google ErrorInfo and redacts keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        failed(400, {
          code: 400,
          status: 'INVALID_ARGUMENT',
          message: 'secret invalid',
          details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
        }),
      ),
    );
    await expect(discoverModels('gemini', 'secret')).rejects.toMatchObject({
      kind: 'invalid',
      code: 'API_KEY_INVALID',
      message: 'gemini HTTP 400: [redacted] invalid',
    } satisfies Partial<ProviderError>);
  });

  it('a 429 benches only that model, not the key, and remembers it after reload', async () => {
    storage.set('jobfill_ai_config', { keys: [{ provider: 'gemini', key: 'secret' }] });
    const fetcher = vi.fn(async (url: string) =>
      url.includes(':generateContent') ? failed(429, { code: 'RATE_LIMIT', message: 'slow down' }) : models(),
    );
    vi.stubGlobal('fetch', fetcher);
    const { runTask } = await import('../ai-engine');
    await expect(runTask('resume_parsing', { resumeText: 'Fixture' })).rejects.toThrow('gemini HTTP 429: slow down');
    expect(storage.get('jobfill_ai_key_state_v1')).toBeUndefined();
    const generations = fetcher.mock.calls.filter(([url]) => String(url).includes(':generateContent')).length;
    vi.resetModules();
    const reloaded = await import('../ai-engine');
    await expect(reloaded.runTask('resume_parsing', { resumeText: 'Fixture' })).rejects.toThrow(
      'cooling down or unavailable',
    );
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes(':generateContent')).length).toBe(generations);
  });

  it('does not reuse an invalid key after reload', async () => {
    storage.set('jobfill_ai_config', { keys: [{ provider: 'gemini', key: 'secret' }] });
    const fetcher = vi.fn(async () =>
      failed(400, {
        status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const { runTask } = await import('../ai-engine');
    await expect(runTask('resume_parsing', { resumeText: 'Fixture' })).rejects.toThrow('gemini HTTP 400');
    vi.resetModules();
    await expect((await import('../ai-engine')).runTask('resume_parsing', { resumeText: 'Fixture' })).rejects.toThrow(
      'Google rejected your saved API key',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('recognizes structured zero quota, scopes it to the requested model and reads retry delay', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              message: 'No quota',
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                  violations: [{ quotaDimensions: { model: 'gemma-fixture' }, quotaValue: '0' }],
                },
                { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '65s' },
              ],
            },
          },
          { status: 429, headers: { 'Retry-After': '60' } },
        ),
      ),
    );
    await expect(complete('gemini', 'secret', 'gemma-fixture', 'prompt')).rejects.toMatchObject({
      status: 429,
      kind: 'cooldown',
      modelScoped: true,
      quotaZero: true,
      retryAfterMs: 65000,
    });
    await expect(complete('gemini', 'secret', 'different-model', 'prompt')).rejects.toMatchObject({
      modelScoped: false,
      quotaZero: false,
    });
  });

  it('times out response-body reads too, not just the initial connection', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ text: () => new Promise<string>(() => undefined) })),
      );
      const result = expect(discoverModels('gemini', 'secret')).rejects.toMatchObject({
        kind: 'cooldown',
        message: expect.stringContaining('timed out'),
      });
      await vi.advanceTimersByTimeAsync(30000);
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
});
