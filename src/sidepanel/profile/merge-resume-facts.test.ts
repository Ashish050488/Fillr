import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resumeFactsSchema } from '../../shared/schemas';
import { mergeResumeFacts } from './merge-resume-facts';
import { emptyProfile } from './create-empty-profile';

const stored = new Map<string, unknown>();
beforeEach(() => {
  stored.clear();
  vi.resetModules();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: stored.get(key) }),
        set: async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) stored.set(key, value);
        },
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('resume parsing rules', () => {
  it('preserves intentional manual blanks and existing facts', () => {
    const profile = emptyProfile();
    profile.fields = { name: { value: 'My name', source: 'manual' }, phone: { value: '', source: 'manual' } };
    profile.skills = ['My existing skill'];
    const merged = mergeResumeFacts(profile, {
      name: { full: 'Different' },
      phone: '999',
      email: 'a@example.com',
      skills: ['New'],
    });
    expect(merged.fields.name.value).toBe('My name');
    expect(merged.fields.phone.value).toBe('');
    expect(merged.fields.email).toEqual({ value: 'a@example.com', source: 'ai', confirmed: false });
    expect(merged.skills).toEqual(['My existing skill']);
    expect(profile.fields.email).toBeUndefined();
  });

  it('rejects unsupported or malformed resume facts', () => {
    expect(resumeFactsSchema.safeParse({ salary: 10000 }).success).toBe(false);
    expect(resumeFactsSchema.safeParse({ yearsExperience: -1 }).success).toBe(false);
    expect(resumeFactsSchema.safeParse({ education: [{ institution: 'College', degree: 'BS' }] }).success).toBe(true);
  });

  it('repairs invalid JSON once with the previous output included', async () => {
    stored.set('jobfill_ai_config', { keys: [{ provider: 'gemini', key: 'fixture-secret' }] });
    let completions = 0;
    const requests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (!url.includes(':generateContent'))
          return Response.json({
            models: [
              {
                name: 'models/gemma-fixture',
                displayName: 'Gemma 4 26B',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          });
        completions += 1;
        requests.push(String(init.body));
        return Response.json({
          candidates: [
            {
              content: {
                parts: [{ text: completions === 1 ? '{bad json' : '```json\n{"name":{"full":"Sample Person"}}\n```' }],
              },
            },
          ],
        });
      }),
    );
    const { runTask } = await import('../../background/ai/ai-engine');
    const result = await runTask('resume_parsing', { resumeText: 'Sample Person' });
    expect((result.result as { name?: { full?: string } }).name?.full).toBe('Sample Person');
    expect(completions).toBe(2);
    expect(requests[1]).toContain('Previous invalid output: {bad json');
    expect(requests[0]).toContain('Extract only facts explicitly stated');
  });

  it('rejects empty key tests and recovers a key after successful re-test', async () => {
    stored.set('jobfill_ai_key_state_v1', {
      'gemini:fixture-secret': { invalid: true, cooldownUntil: Date.now() + 10000 },
    });
    const { testKey } = await import('../../background/ai/ai-engine');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ models: [] })),
    );
    await expect(testKey('gemini', 'fixture-secret')).rejects.toThrow('No models discovered');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ models: [{ name: 'models/fixture-model', supportedGenerationMethods: ['generateContent'] }] }),
      ),
    );
    await expect(testKey('gemini', 'fixture-secret')).resolves.toEqual(['fixture-model']);
    const state = stored.get('jobfill_ai_key_state_v1');
    expect(state).not.toMatchObject({ 'gemini:fixture-secret': { invalid: true } });
  });
});
