import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taskModels } from '../models/model-selection';
import { validateTaskResult } from '../tasks/task-prompts';

// Synthetic IDs. Display names represent the user's supplied free-tier list.
const gemmas = [
  { name: 'models/gemma-fixture-a', displayName: 'Gemma 4 26B', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemma-fixture-b', displayName: 'Gemma 4 31B', supportedGenerationMethods: ['generateContent'] },
];
const success = (text = '{"name":{"full":"Sample Person"}}') =>
  Response.json({ candidates: [{ content: { parts: [{ text }] } }] });
const fail = (status: number, message = 'fixture model unavailable', details?: unknown[]) =>
  Response.json({ error: { status: 'TEST_ERROR', message, details } }, { status });
const stored = new Map<string, unknown>();
const context = { resumeText: 'Sample Person' };
const generationModel = (url: string) => decodeURIComponent(url.split('/models/')[1].split(':')[0]);

beforeEach(() => {
  vi.resetModules();
  stored.clear();
  stored.set('jobfill_ai_config', {
    keys: [{ provider: 'gemini', key: 'key-a' }],
    model: { gemini: 'gemini-2.5-flash' },
  });
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: stored.get(key) }),
        set: async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) stored.set(key, structuredClone(value));
        },
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('task model routing: quotas, caching and limits', () => {
  it('persists round-robin position across worker reloads and caches model discovery', async () => {
    stored.set('jobfill_ai_config', {
      keys: [
        { provider: 'gemini', key: 'key-a' },
        { provider: 'gemini', key: 'key-b' },
      ],
    });
    const attempts: string[] = [];
    let discoveries = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (!url.includes(':generateContent')) {
          discoveries++;
          return Response.json({ models: gemmas });
        }
        attempts.push(new Headers(init.headers).get('x-goog-api-key')!);
        return success();
      }),
    );
    await (await import('../ai-engine')).runTask('resume_parsing', { resumeText: 'One' });
    vi.resetModules();
    const engine = await import('../ai-engine');
    await engine.runTask('resume_parsing', { resumeText: 'Two' });
    await engine.runTask('resume_parsing', { resumeText: 'Three' });
    expect(attempts).toEqual(['key-a', 'key-b', 'key-a']);
    expect(discoveries).toBe(2);
  });

  it('caps failed generation calls, including repair attempts', async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ ...gemmas[0], name: `models/gemma-fixture-${index}` }));
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: many });
        calls++;
        return calls % 2 ? success('not json') : fail(400, 'incompatible parameters');
      }),
    );
    await expect((await import('../ai-engine')).runTask('resume_parsing', context)).rejects.toThrow(
      'request safety limit',
    );
    expect(calls).toBe(10);
    expect(stored.get('jobfill_ai_key_state_v1')).toBeUndefined();
  });

  it('returns no models at all when neither Gemma nor allowed Flash exists', () => {
    expect(taskModels([{ id: 'gemini-pro', displayName: 'Gemini 3.8 Pro' }], 'resume_parsing', 'gemini')).toEqual([]);
  });

  it('rejects paid/unknown models and unsafe or populated AI-filled fields', () => {
    expect(
      taskModels(
        [{ id: 'google/gemma-fixture:free', displayName: 'Gemma 4 26B', free: true }],
        'resume_parsing',
        'openrouter',
      ),
    ).toHaveLength(1);
    expect(
      taskModels([{ id: 'google/gemma-fixture', displayName: 'Gemma 4 26B' }], 'resume_parsing', 'openrouter'),
    ).toHaveLength(0);
    expect(
      taskModels([{ id: 'gemini-pro', displayName: 'Gemini 3.8 Flash' }], 'cover_letter_answers', 'gemini'),
    ).toHaveLength(0);
    expect(() =>
      validateTaskResult('fill_empty_fields', { ...context, fields: ['salary'] }, { fields: { salary: '100000' } }),
    ).toThrow();
    expect(() =>
      validateTaskResult(
        'fill_empty_fields',
        { ...context, fields: ['email'], profileFields: { email: 'mine@example.com' } },
        { fields: { email: 'other@example.com' } },
      ),
    ).toThrow();
  });

  it('skips zero-quota Gemma for 24 hours but can use the other Gemma', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: gemmas });
        const model = generationModel(url);
        return model === 'gemma-fixture-a'
          ? fail(429, 'zero quota', [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [{ quotaDimensions: { model }, quotaValue: '0' }],
              },
            ])
          : success();
      }),
    );
    expect((await (await import('../ai-engine')).runTask('resume_parsing', context)).model).toBe('gemma-fixture-b');
    const usage = stored.get('jobfill_ai_usage_v1') as Record<string, { exhausted?: string; day: string }>;
    const entry = Object.entries(usage).find(([id]) => id.endsWith('|gemma-fixture-a'))![1];
    expect(entry.exhausted).toBe(entry.day);
    expect(stored.get('jobfill_ai_key_state_v1')).toBeUndefined();
  });

  it('answers an identical request from the response cache without a call', async () => {
    let generations = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: gemmas });
        generations++;
        return success();
      }),
    );
    const engine = await import('../ai-engine');
    await engine.runTask('resume_parsing', context);
    await engine.runTask('resume_parsing', context);
    expect(generations).toBe(1);
  });

  it('skips a model whose daily quota is used up, before sending anything', async () => {
    const tried: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: gemmas });
        tried.push(generationModel(url));
        return generationModel(url) === 'gemma-fixture-a'
          ? fail(429, 'Quota exceeded for metric generate_content_free_tier_requests, limit: 14400 per day')
          : success();
      }),
    );
    const engine = await import('../ai-engine');
    await engine.runTask('resume_parsing', { resumeText: 'First' });
    await engine.runTask('resume_parsing', { resumeText: 'Second' });
    expect(tried).toEqual(['gemma-fixture-a', 'gemma-fixture-b', 'gemma-fixture-b']);
  });

  it('uses a 24-hour discovery cache and supports an explicit refresh', async () => {
    const fetcher = vi.fn(async () => Response.json({ models: gemmas }));
    vi.stubGlobal('fetch', fetcher);
    const { cachedModelCatalog } = await import('../models/model-catalog-cache');
    await cachedModelCatalog('gemini', 'key-a');
    await cachedModelCatalog('gemini', 'key-a');
    expect(fetcher).toHaveBeenCalledTimes(1);
    await cachedModelCatalog('gemini', 'key-a', { refresh: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const cache = stored.get('jobfill_ai_model_catalog_v1') as Record<string, { at: number }>;
    Object.values(cache)[0].at -= 86_400_001;
    await cachedModelCatalog('gemini', 'key-a');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
