import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  reply: (value: unknown) => void,
) => boolean | void;
const stored = new Map<string, unknown>();
const listeners: Listener[] = [];
const extensionSender = {
  id: 'fixture-extension',
  url: 'chrome-extension://fixture-extension/options.html',
  tab: { id: 1, url: 'chrome-extension://fixture-extension/options.html' } as chrome.tabs.Tab,
} satisfies chrome.runtime.MessageSender;
const successModels = () =>
  Response.json({ models: [{ name: 'models/fixture', supportedGenerationMethods: ['generateContent'] }] });

function send(action: string, payload: unknown, sender: chrome.runtime.MessageSender = extensionSender) {
  return new Promise<unknown>((resolve) => {
    for (const listener of listeners) listener({ action, payload }, sender, resolve);
  });
}

beforeEach(() => {
  vi.resetModules();
  stored.clear();
  listeners.length = 0;
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'fixture-extension',
      getURL: (path: string) => `chrome-extension://fixture-extension/${path}`,
      onMessage: { addListener: (listener: Listener) => listeners.push(listener) },
    },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: stored.get(key) })),
        set: vi.fn(async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) stored.set(key, structuredClone(value));
        }),
        setAccessLevel: vi.fn(async () => undefined),
      },
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successModels()),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('API key add and retry', () => {
  it('accepts a full-tab options sender, tests then saves, and returns only masked data', async () => {
    (await import('../messaging/register-background-handlers')).registerBackgroundHandlers();
    const result = await send('AI_SAVE_KEY', { provider: 'gemini', key: ' fixture-secret ' });
    expect(result).toMatchObject({ success: true, id: 'gemini-0' });
    expect(JSON.stringify(result)).not.toContain('fixture-secret');
    expect(stored.get('jobfill_ai_config')).toMatchObject({ keys: [{ key: 'fixture-secret' }] });
    expect(fetch).toHaveBeenCalledTimes(1);
    const list = await send('AI_KEY_INFO', undefined);
    expect(list).toMatchObject({ success: true, keys: [{ id: 'gemini-0' }] });
    expect(JSON.stringify(list)).not.toContain('fixture-secret');
  });

  it('does not duplicate keys when add is retried', async () => {
    const { saveKey } = await import('./ai-engine');
    const first = await saveKey('gemini', ' fixture-secret ');
    expect(await saveKey('gemini', 'fixture-secret')).toEqual(first);
    expect(stored.get('jobfill_ai_config')).toEqual({
      keys: [{ provider: 'gemini', key: 'fixture-secret', enabled: true }],
    });
  });

  it('rejects empty model tests and real provider failures without storing a new key', async () => {
    (await import('../messaging/register-background-handlers')).registerBackgroundHandlers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ models: [] })),
    );
    expect(await send('AI_SAVE_KEY', { provider: 'gemini', key: 'fixture-secret' })).toMatchObject({ success: false });
    expect(stored.has('jobfill_ai_config')).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { message: 'Rejected fixture-secret' } }, { status: 401 })),
    );
    const result = await send('AI_SAVE_KEY', { provider: 'gemini', key: 'fixture-secret' });
    expect(result).toMatchObject({ success: false, error: 'gemini HTTP 401: Rejected [redacted]' });
    expect(stored.has('jobfill_ai_config')).toBe(false);
  });

  it('retests an existing key by id and clears a previous invalid state', async () => {
    stored.set('jobfill_ai_config', { keys: [{ provider: 'gemini', key: 'fixture-secret' }] });
    stored.set('jobfill_ai_key_state_v1', { 'gemini:fixture-secret': { invalid: true } });
    (await import('../messaging/register-background-handlers')).registerBackgroundHandlers();
    expect(await send('AI_TEST_KEY', { id: 'gemini-0' })).toMatchObject({ success: true, models: ['fixture'] });
    expect(stored.get('jobfill_ai_key_state_v1')).not.toMatchObject({ 'gemini:fixture-secret': { invalid: true } });
  });

  it('denies webpage senders even if tab.url points to options, and rejects malformed payloads', async () => {
    (await import('../messaging/register-background-handlers')).registerBackgroundHandlers();
    const content = { ...extensionSender, url: 'https://example.com/application' };
    expect(await send('AI_SAVE_KEY', { provider: 'gemini', key: 'fixture-secret' }, content)).toMatchObject({
      success: false,
    });
    expect(await send('AI_KEY_INFO', undefined, { id: 'fixture-extension' })).toMatchObject({ success: false });
    expect(await send('AI_SAVE_KEY', { provider: 'wrong', key: 12 })).toMatchObject({ success: false });
    expect(await send('AI_TEST_KEY', { provider: 'gemini', key: '   ' })).toMatchObject({ success: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('service worker readiness', () => {
  it('registers listeners immediately and gates key access until storage is secured', async () => {
    let release: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(chrome.storage.local.setAccessLevel).mockReturnValue(ready as unknown as void);
    vi.stubGlobal('defineBackground', (main: () => void) => main);
    const background = await import('../../../entrypoints/background');
    (background.default as unknown as () => void)();
    expect(listeners.length).toBeGreaterThan(0);
    const request = send('AI_SAVE_KEY', { provider: 'gemini', key: 'fixture-secret' });
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    release();
    expect(await request).toMatchObject({ success: true });
    expect(chrome.storage.local.setAccessLevel).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_CONTEXTS' });
  });

  it('fails closed with an actionable error if storage isolation fails', async () => {
    (await import('../messaging/register-background-handlers')).registerBackgroundHandlers(
      Promise.reject(new Error('unavailable')),
    );
    expect(await send('AI_SAVE_KEY', { provider: 'gemini', key: 'fixture-secret' })).toMatchObject({
      success: false,
      error: 'JobFill could not secure local storage. Reload the extension and try again.',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(chrome.storage.local.get).not.toHaveBeenCalled();
  });
});
