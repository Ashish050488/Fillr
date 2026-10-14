import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { atsName, htmlToText } from './fetch-ats-job';
import { jobKey } from '../jobs/job-store';

const store = new Map<string, unknown>();
beforeEach(() => {
  vi.resetModules();
  store.clear();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: store.get(key) }),
        set: async (values: Record<string, unknown>) => {
          Object.entries(values).forEach(([key, value]) => store.set(key, structuredClone(value)));
        },
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('ATS postings', () => {
  it('turns ATS HTML, including Greenhouse double-encoding, into readable text', () => {
    expect(
      htmlToText('&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;&lt;ul&gt;&lt;li&gt;TypeScript&lt;/li&gt;&lt;/ul&gt;'),
    ).toBe('Build & ship\n\n* TypeScript');
    expect(atsName('https://jobs.lever.co/acme/123')).toBe('Lever');
    expect(atsName('https://acme.wd5.myworkdayjobs.com/en-US/External/job/X_R1')).toBe('Workday');
  });

  it('reads a Greenhouse posting from its public API, also from an embedded iframe URL', async () => {
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toBe('https://boards-api.greenhouse.io/v1/boards/globex/jobs/4012345');
      return Response.json({
        title: 'Payments Engineer',
        company_name: 'Globex',
        location: { name: 'Remote' },
        content: '&lt;p&gt;Own the ledger.&lt;/p&gt;',
      });
    });
    vi.stubGlobal('fetch', fetcher);
    const { fetchAtsJob } = await import('./fetch-ats-job');
    const job = await fetchAtsJob(
      'https://globex.com/careers?gh_jid=4012345',
      'https://boards.greenhouse.io/embed/job_app?for=globex&token=4012345',
    );
    expect(job).toMatchObject({
      ats: 'Greenhouse',
      title: 'Payments Engineer',
      company: 'Globex',
      location: 'Remote',
      description: 'Own the ledger.',
    });
    await fetchAtsJob('https://boards.greenhouse.io/embed/job_app?for=globex&token=4012345');
    expect(fetcher).toHaveBeenCalledTimes(1); // cached
  });

  it('reads Lever from the apply page too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe('https://api.lever.co/v0/postings/acme/0b4f1d2e-1111-2222-3333-444455556666');
        return Response.json({
          text: 'Backend Engineer',
          categories: { location: 'Bengaluru', commitment: 'Full-time' },
          descriptionPlain: 'Intro',
          lists: [{ text: 'You have', content: '<li>Go</li>' }],
        });
      }),
    );
    const { fetchAtsJob } = await import('./fetch-ats-job');
    expect(await fetchAtsJob('https://jobs.lever.co/acme/0b4f1d2e-1111-2222-3333-444455556666/apply')).toMatchObject({
      title: 'Backend Engineer',
      company: 'Acme',
      location: 'Bengaluru',
      employmentType: 'Full-time',
      description: 'Intro\n\nYou have:\n* Go',
    });
  });

  it('maps thank-you pages back to the application', () => {
    expect(jobKey('https://jobs.lever.co/acme/123/thanks')).toBe(jobKey('https://jobs.lever.co/acme/123'));
    expect(jobKey('https://boards.greenhouse.io/acme/jobs/9/confirmation')).toBe(
      jobKey('https://boards.greenhouse.io/acme/jobs/9'),
    );
  });
});

describe('free-tier usage tracking', () => {
  it('tells daily quota apart from a per-minute spike', async () => {
    const { isDailyQuota } = await import('../ai/routing/model-usage-tracker');
    expect(isDailyQuota('Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, per day')).toBe(
      true,
    );
    expect(isDailyQuota('RESOURCE_EXHAUSTED')).toBe(true);
    expect(isDailyQuota('Quota exceeded: requests per minute')).toBe(false);
  });

  it('skips a combo before sending once its daily or per-minute budget is spent', async () => {
    const usage = await import('../ai/routing/model-usage-tracker');
    const now = Date.now();
    for (let call = 0; call < 4; call += 1) await usage.recordRequest('k', 'gemini-3.8-flash', 100, now);
    expect(await usage.canUse('k', 'gemini-3.8-flash', 100, now)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('per-minute'),
    });
    expect((await usage.canUse('k', 'gemini-3.8-flash', 100, now + 61_000)).ok).toBe(true);
    await usage.markExhausted('k', 'gemma-4-26b-a4b-it', now);
    expect(await usage.canUse('k', 'gemma-4-26b-a4b-it', 100, now)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('daily'),
    });
    // Gemma's 15k tokens-per-minute budget: a huge prompt is routed elsewhere instead of failing.
    expect(await usage.canUse('k2', 'gemma-4-31b-it', 20_000, now)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('too large'),
    });
  });

  it('opens the breaker after repeated server failures', async () => {
    const usage = await import('../ai/routing/model-usage-tracker');
    const now = Date.now();
    for (let fail = 0; fail < 3; fail += 1) await usage.recordFailure('k', 'gemma-4-26b-a4b-it', now);
    expect((await usage.canUse('k', 'gemma-4-26b-a4b-it', 10, now)).ok).toBe(false);
    expect((await usage.canUse('k', 'gemma-4-26b-a4b-it', 10, now + 6 * 60_000)).ok).toBe(true);
  });
});
