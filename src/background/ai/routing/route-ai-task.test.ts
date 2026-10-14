import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Synthetic IDs. Display names represent the user's supplied free-tier list.
const gemmas = [
  { name: 'models/gemma-fixture-a', displayName: 'Gemma 4 26B', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemma-fixture-b', displayName: 'Gemma 4 31B', supportedGenerationMethods: ['generateContent'] },
];
const writers = [
  { name: 'models/gemini-fixture-a', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] },
  {
    name: 'models/gemini-fixture-b',
    displayName: 'Gemini 3.5 Flash Lite',
    supportedGenerationMethods: ['generateContent'],
  },
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

describe('task model routing: order and fallback', () => {
  it('parses resumes on Gemini Flash-Lite first, falls back across models and remembers a 404', async () => {
    const tried: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (!url.includes(':generateContent')) return Response.json({ models: [...writers, ...gemmas] });
        const model = generationModel(url);
        tried.push(model);
        const body = JSON.parse(String(init.body));
        expect(body.systemInstruction).toBeUndefined();
        if (model.startsWith('gemma')) expect(body.generationConfig).toBeUndefined();
        else expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(new Headers(init.headers).get('authorization')).toBeNull();
        return model === 'gemini-fixture-b' ? fail(404) : success();
      }),
    );
    const engine = await import('../ai-engine');
    expect((await engine.runTask('resume_parsing', context)).model).toBe('gemini-fixture-a');
    expect(tried).toEqual(['gemini-fixture-b', 'gemini-fixture-a']);
    vi.resetModules();
    await (await import('../ai-engine')).runTask('resume_parsing', { resumeText: 'Another Person' });
    // The 404 model is remembered and not asked again.
    expect(tried).toEqual(['gemini-fixture-b', 'gemini-fixture-a', 'gemini-fixture-a']);
  });

  it('writes with Gemini Flash, cleans job pages with Gemma, and never uses a paid model', async () => {
    const tried: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: [...gemmas, ...writers] });
        const model = generationModel(url);
        tried.push(model);
        return success(model.startsWith('gemini') ? '{"answer":"A grounded draft."}' : '{"title":"Engineer"}');
      }),
    );
    const engine = await import('../ai-engine');
    await engine.runTask('job_parsing', { pageText: 'Engineer wanted' });
    const writing = await engine.runTask('cover_letter_answers', { ...context, jobDescription: 'Entry-level role' });
    expect(writing.result).toEqual({ answer: 'A grounded draft.' });
    expect(tried).toEqual(['gemma-fixture-a', 'gemini-fixture-a']);
  });

  it('uses another model after a structured model-specific 429, without invalidating the key', async () => {
    const tried: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: writers });
        const model = generationModel(url);
        tried.push(model);
        return model === 'gemini-fixture-a'
          ? fail(429, 'quota exceeded', [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [{ quotaDimensions: { model }, quotaValue: '20' }],
              },
            ])
          : success('{"answer":"Draft"}');
      }),
    );
    await (await import('../ai-engine')).runTask('cover_letter_answers', { ...context, jobDescription: 'Role' });
    expect(tried).toEqual(['gemini-fixture-a', 'gemini-fixture-b']);
    expect(stored.get('jobfill_ai_key_state_v1')).toBeUndefined();
  });

  it('on a 429 tries the same model on the next key first (model-major, like jobmesh)', async () => {
    stored.set('jobfill_ai_config', {
      keys: [
        { provider: 'gemini', key: 'key-a' },
        { provider: 'gemini', key: 'key-b' },
      ],
    });
    const attempts: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (!url.includes(':generateContent')) return Response.json({ models: gemmas });
        const key = new Headers(init.headers).get('x-goog-api-key')!;
        attempts.push(`${key}/${generationModel(url)}`);
        return key === 'key-a' ? fail(429, 'generic rate limit') : success();
      }),
    );
    await (await import('../ai-engine')).runTask('resume_parsing', context);
    expect(attempts).toEqual(['key-a/gemma-fixture-a', 'key-b/gemma-fixture-a']);
    expect(stored.get('jobfill_ai_key_state_v1')).toBeUndefined();
  });

  it('on 500/503 moves straight to the next model, and retries a busy model only after all were tried', async () => {
    const tried: string[] = [];
    let flashCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: [...gemmas, ...writers] });
        const model = generationModel(url);
        tried.push(model);
        if (model === 'gemini-fixture-a') {
          flashCalls += 1;
          return flashCalls === 1 ? fail(503, 'high demand') : success('{"answer":"Draft"}');
        }
        return fail(500, 'Internal error encountered.');
      }),
    );
    const result = await (
      await import('../ai-engine')
    ).runTask('cover_letter_answers', { ...context, jobDescription: 'Role' });
    expect(result.model).toBe('gemini-fixture-a');
    // One pass over every model with no immediate same-model retries, then a second try of the best.
    expect(tried).toEqual([
      'gemini-fixture-a',
      'gemini-fixture-b',
      'gemma-fixture-a',
      'gemma-fixture-b',
      'gemini-fixture-a',
    ]);
    expect(stored.get('jobfill_ai_key_state_v1')).toBeUndefined();
  }, 15000);

  it('round-robins the starting model inside a tier across requests', async () => {
    const lites = [
      writers[1],
      { ...writers[1], name: 'models/gemini-fixture-c', displayName: 'Gemini 3.1 Flash Lite' },
    ];
    const tried: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (!url.includes(':generateContent')) return Response.json({ models: lites });
        tried.push(generationModel(url));
        return success();
      }),
    );
    const engine = await import('../ai-engine');
    await engine.runTask('resume_parsing', { resumeText: 'One' });
    await engine.runTask('resume_parsing', { resumeText: 'Two' });
    await engine.runTask('resume_parsing', { resumeText: 'Three' });
    expect(tried).toEqual(['gemini-fixture-b', 'gemini-fixture-c', 'gemini-fixture-b']);
  });

  it('falls back to free Gemini Flash for parsing when no Gemma is available', async () => {
    const fetcher = vi.fn(async () => Response.json({ models: writers }));
    vi.stubGlobal('fetch', fetcher);
    await expect((await import('../ai-engine')).runTask('resume_parsing', context)).rejects.toThrow(
      'No eligible free-tier model',
    );
    const urls = fetcher.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(urls.some((url) => url.includes('gemini-fixture') && url.includes(':generateContent'))).toBe(true);
  });
});
