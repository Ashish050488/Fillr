import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyProviderFailure, discoverModels, ProviderError } from '../../background/ai/providers/provider-client';
import { isMessageAction } from './message-actions';
import { sendMessage } from './extension-messages';

describe('provider failure classification', () => {
  it('cools down only retryable statuses', () => {
    expect(classifyProviderFailure(429, 'RATE_LIMIT', 'slow down').kind).toBe('cooldown');
    expect(classifyProviderFailure(503, 'UNAVAILABLE', 'down').kind).toBe('cooldown');
    expect(classifyProviderFailure(404, 'NOT_FOUND', 'model missing').kind).toBe('other');
    expect(classifyProviderFailure(400, 'INVALID_ARGUMENT', 'bad model').kind).toBe('other');
  });

  it('marks only explicit authentication failures as invalid', () => {
    expect(classifyProviderFailure(401, 'UNAUTHENTICATED', 'denied').kind).toBe('invalid');
    expect(classifyProviderFailure(400, 'API_KEY_INVALID', 'bad key').kind).toBe('invalid');
    expect(classifyProviderFailure(400, 'INVALID_ARGUMENT', 'bad model').kind).toBe('other');
  });
});

describe('provider errors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves provider, status, and reason for a non-punishing 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'model missing' } }), { status: 404 }),
      ),
    );

    await expect(discoverModels('groq', 'secret')).rejects.toMatchObject({
      provider: 'groq',
      status: 404,
      kind: 'other',
      code: 'NOT_FOUND',
      message: 'groq HTTP 404: model missing',
    } satisfies Partial<ProviderError>);
  });
});

describe('message guard', () => {
  it('accepts all AI actions', () => {
    expect(isMessageAction('AI_TEST_KEY')).toBe(true);
    expect(isMessageAction('AI_KEY_INFO')).toBe(true);
    expect(isMessageAction('AI_SAVE_KEY')).toBe(true);
    expect(isMessageAction('AI_LOAD_MODELS')).toBe(true);
    expect(isMessageAction('AI_TASK')).toBe(true);
    expect(isMessageAction('CONTENT_MESSAGE')).toBe(true);
  });

  it('uses the exact message when the extension context is gone', async () => {
    const send = vi.fn((_message: unknown, callback: (response?: unknown) => void) => callback());
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: send, lastError: { message: 'Extension context invalidated' } },
    });

    await expect(sendMessage('AI_KEY_INFO', undefined)).rejects.toThrow(
      'JobFill was updated or reloaded. Refresh this page and try again.',
    );
  });
});
