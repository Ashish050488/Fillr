import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jobKey } from '../../shared/jobs/job-key';

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

const job = (url: string, extra: Record<string, unknown> = {}) => ({
  id: url,
  url,
  date: '2026-10-13',
  timestamp: 1,
  status: 'saved',
  fieldsFilled: 0,
  ...extra,
});

describe('one record per job', () => {
  it('treats every Workday URL for a requisition as the same job', () => {
    const base = 'https://hpe.wd5.myworkdayjobs.com';
    const keys = [
      `${base}/Jobsathpe/job/Bangalore-Karnataka-India/Fullstack-Developer_1193412`,
      `${base}/en-US/Jobsathpe/job/Bangalore-Karnataka-India/Fullstack-Developer_1193412/apply/applyManually`,
      `${base}/en-US/Jobsathpe/details/Fullstack-Developer_1193412?q=x`,
    ].map(jobKey);
    expect(keys[0]).toBe(keys[1]);
    expect(jobKey('https://jobs.lever.co/acme/123/apply/step-2')).toBe(jobKey('https://jobs.lever.co/acme/123'));
  });

  it('merges duplicate records, keeping the furthest status and the letter', async () => {
    store.set('jobfill_jobs_v1', [
      job('https://hpe.wd5.myworkdayjobs.com/Jobsathpe/job/X/Dev_R1', {
        jobTitle: 'Dev',
        status: 'filled',
        coverLetter: 'Dear team',
      }),
      job('https://hpe.wd5.myworkdayjobs.com/en-US/Jobsathpe/job/X/Dev_R1/apply', { status: 'applied', timestamp: 5 }),
    ]);
    const jobs = await import('./job-tracking');
    await jobs.jobsMissingTitles();
    const saved = store.get('jobfill_jobs_v1') as Array<{ status: string; coverLetter?: string; jobTitle?: string }>;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ status: 'applied', coverLetter: 'Dear team', jobTitle: 'Dev' });
  });

  it('keeps the applied count in step with manual status changes', async () => {
    store.set('jobfill_jobs_v1', [job('https://jobs.lever.co/acme/123')]);
    const jobs = await import('./job-tracking');
    const applied = await jobs.setStatus('https://jobs.lever.co/acme/123', 'applied');
    expect(applied.appliedAt).toBeGreaterThan(0);
    expect((store.get('jobfill_lifetime_metrics_v1') as { totalJobsApplied: number }).totalJobsApplied).toBe(1);
    await jobs.setStatus('https://jobs.lever.co/acme/123', 'interview');
    expect((store.get('jobfill_lifetime_metrics_v1') as { totalJobsApplied: number }).totalJobsApplied).toBe(1);
    await jobs.setStatus('https://jobs.lever.co/acme/123', 'saved');
    expect((store.get('jobfill_lifetime_metrics_v1') as { totalJobsApplied: number }).totalJobsApplied).toBe(0);
  });
});
