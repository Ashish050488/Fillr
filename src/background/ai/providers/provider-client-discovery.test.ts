import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverModelCatalog, discoverModels } from './provider-client';

const storage = new Map<string, unknown>();

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

describe('model discovery', () => {
  it('uses the Gemini API-key header and parses Gemini model names', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('gemini-secret');
      expect(new Headers(init?.headers).get('authorization')).toBeNull();
      return new Response(
        JSON.stringify({
          models: [
            { name: 'models/gemini-writing', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] },
          ],
        }),
      );
    });
    vi.stubGlobal('fetch', fetcher);

    await expect(discoverModels('gemini', 'gemini-secret')).resolves.toEqual(['gemini-writing']);
  });

  it('discovers Gemma on a later page, keeps pagination parameters and filters generation methods', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        return urls.length === 1
          ? Response.json({
              models: [{ name: 'models/gemini-fixture', supportedGenerationMethods: ['generateContent'] }],
              nextPageToken: 'next page',
            })
          : Response.json({
              models: [
                {
                  name: 'models/gemma-fixture',
                  displayName: 'Gemma 4 26B',
                  supportedGenerationMethods: ['generateContent'],
                },
                { name: 'models/embedding-fixture', supportedGenerationMethods: ['embedContent'] },
              ],
            });
      }),
    );
    expect(await discoverModels('gemini', 'secret')).toEqual(['gemini-fixture', 'gemma-fixture']);
    expect(new URL(urls[0]).searchParams.get('pageSize')).toBe('1000');
    expect(new URL(urls[1]).searchParams.get('pageSize')).toBe('1000');
    expect(new URL(urls[1]).searchParams.get('pageToken')).toBe('next page');
  });

  it('stops repeated pagination instead of caching an incomplete model list', async () => {
    const fetcher = vi.fn(async () => Response.json({ models: [], nextPageToken: 'repeated' }));
    vi.stubGlobal('fetch', fetcher);
    await expect(discoverModels('gemini', 'secret')).rejects.toThrow('repeated a page');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('only identifies OpenRouter :free variants with verified zero prompt/completion pricing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: [
            { id: 'google/gemma-fixture:free', pricing: { prompt: '0.0', completion: '0' } },
            { id: 'google/gemma-fixture-paid', pricing: { prompt: '0', completion: '0' } },
            { id: 'google/gemma-fixture-unverified:free' },
            { id: 'google/gemma-fixture-notfree:free', pricing: { prompt: '1', completion: '0' } },
          ],
        }),
      ),
    );
    const catalog = await discoverModelCatalog('openrouter', 'secret');
    expect(catalog.filter((model) => model.free).map((model) => model.id)).toEqual(['google/gemma-fixture:free']);
  });
});
