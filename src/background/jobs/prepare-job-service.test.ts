import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jobKey, labelKey } from './job-store';
import type { FormQuestion, PageScan } from '../../shared/types';

const profile = {
  id: 'p',
  name: 'Me',
  fields: { name: { value: 'Jane Doe' } },
  skills: ['TypeScript'],
  certifications: [],
  languages: [],
  workExperience: [{ company: 'Acme' }],
  education: [],
  projects: [],
};
const letter: FormQuestion = { id: 'q0', label: 'Cover letter *', kind: 'long' };
const why: FormQuestion = { id: 'q1', label: 'Why Globex?', kind: 'long' };
const scan = (url: string, questions: FormQuestion[]): PageScan => ({
  url,
  pageText: 'noisy posting text '.repeat(30),
  questions,
});

let store: Map<string, unknown>;
let runTask: ReturnType<typeof vi.fn>;

async function setup(score: number) {
  store = new Map<string, unknown>([['jobfill_profiles', [profile]]]);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store.get(key) })),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.entries(values).forEach(([storageKey, storedValue]) => store.set(storageKey, storedValue));
        }),
      },
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => 'id-1' });
  runTask = vi.fn(
    async (
      task: string,
      input: { questions?: FormQuestion[]; jobDescription?: string; candidate?: unknown; minScore?: number },
    ) => {
      if (task === 'job_parsing')
        return { result: { title: 'Payments Engineer', company: 'Globex', requirements: ['TypeScript'] } };
      if (task === 'job_match') {
        expect(input.jobDescription).toContain('Requirements:\n* TypeScript');
        expect(input.candidate).toMatchObject({ name: 'Jane Doe', skills: ['TypeScript'] });
        const qualifies = score >= (input.minScore ?? 55);
        return {
          result: {
            fit: {
              score,
              verdict: qualifies ? 'good' : 'weak',
              headline: 'h',
              matches: [],
              gaps: [],
              dealbreakers: [],
              tips: [],
              keywords: [],
            },
            coverLetter: qualifies ? 'Dear Hiring Team, letter' : '',
            answers: qualifies
              ? Object.fromEntries(
                  (input.questions ?? []).map((question) => [question.id, `answer to ${question.label}`]),
                )
              : {},
          },
        };
      }
      return {
        result: {
          answers: Object.fromEntries(
            (input.questions ?? []).map((question) => [question.id, `late answer to ${question.label}`]),
          ),
        },
      };
    },
  );
  vi.doMock('../ai/ai-engine', () => ({ runTask }));
  return import('./prepare-job-service');
}

const calls = (task: string) => runTask.mock.calls.filter(([name]) => name === task).length;

describe('job keys', () => {
  it('shares one record between a posting and its apply page, and keeps job ids', () => {
    expect(jobKey('https://jobs.lever.co/acme/123/apply')).toBe(jobKey('https://jobs.lever.co/acme/123?utm=x'));
    expect(jobKey('https://boards.greenhouse.io/acme?gh_jid=9')).not.toBe(
      jobKey('https://boards.greenhouse.io/acme?gh_jid=10'),
    );
    expect(labelKey('Cover Letter *')).toBe(labelKey('cover letter'));
  });
});

describe('prepareJob', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('../ai/ai-engine');
  });

  it('gets fit, letter and every answer in one Gemini call, then reuses them', async () => {
    const { prepareJob } = await setup(82);
    const first = await prepareJob({ scan: scan('https://jobs.lever.co/globex/1', [letter]) });
    // Cover-letter fields always get the one saved, editable letter for this company.
    expect(first.answers.q0).toBe('Dear Hiring Team, letter');
    expect(first.job.analysis?.score).toBe(82);
    expect(first.job.coverLetter).toBe('Dear Hiring Team, letter');
    expect([calls('job_parsing'), calls('job_match'), calls('answer_questions')]).toEqual([1, 1, 0]);

    // The /apply page reuses everything; only the brand-new question costs a call.
    const second = await prepareJob({
      scan: scan('https://jobs.lever.co/globex/1/apply', [
        { ...letter, id: 'a' },
        { ...why, id: 'b' },
      ]),
    });
    expect(second.answers).toEqual({ a: 'Dear Hiring Team, letter', b: 'late answer to Why Globex?' });
    expect([calls('job_parsing'), calls('job_match'), calls('answer_questions')]).toEqual([1, 1, 1]);
    expect(runTask.mock.calls.at(-1)?.[1].questions).toEqual([{ ...why, id: 'b' }]);

    // A third fill makes no AI calls at all.
    await prepareJob({
      scan: scan('https://jobs.lever.co/globex/1/apply', [
        { ...letter, id: 'a' },
        { ...why, id: 'b' },
      ]),
    });
    expect(runTask).toHaveBeenCalledTimes(3);
  });

  it('holds questions for a weak fit until you choose Fill anyway', async () => {
    const { prepareJob } = await setup(20);
    const held = await prepareJob({ scan: scan('https://x.example/job/7', [letter, why]) });
    expect(held).toMatchObject({ held: true, answers: {} });
    expect(calls('answer_questions')).toBe(0);
    const forced = await prepareJob({ scan: scan('https://x.example/job/7', [letter, why]), force: true });
    expect(forced.held).toBe(false);
    expect(Object.keys(forced.answers)).toEqual(['q0', 'q1']);
    expect(forced.job.coverLetter).toBe('late answer to Cover letter *');
    expect(calls('job_match')).toBe(1);
  });

  it('analyses without writing extra answers when only checking fit', async () => {
    const { prepareJob } = await setup(20);
    await prepareJob({ scan: scan('https://x.example/job/8', [why]), analyzeOnly: true, force: true });
    expect(calls('answer_questions')).toBe(0);
  });
});

describe('safety', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('../ai/ai-engine');
  });

  it('refuses an empty profile instantly, before any AI call or saved record', async () => {
    const { prepareJob } = await setup(90);
    store.set('jobfill_profiles', [{ ...profile, fields: {}, skills: [], workExperience: [] }]);
    await expect(prepareJob({ scan: scan('https://x.example/job/1', [letter]) })).rejects.toThrow('profile is empty');
    expect(runTask).not.toHaveBeenCalled();
    expect(store.get('jobfill_jobs_v1')).toBeUndefined();
  });

  it('shares one AI run when the widget and the panel ask at the same time', async () => {
    const { prepareJob } = await setup(90);
    const request = { scan: scan('https://x.example/job/2', [letter]) };
    const [first, second] = await Promise.all([prepareJob(request), prepareJob(request)]);
    expect(first).toBe(second);
    expect(calls('job_match')).toBe(1);
  });
});

describe('isOtherCompany', () => {
  it('spots a saved record that belongs to another company', async () => {
    const { isOtherCompany } = await import('./prepare-job-service');
    expect(isOtherCompany('Babaclick', 'Taskwiser')).toBe(true);
    expect(isOtherCompany('Taskwiser Inc.', 'taskwiser')).toBe(false);
    expect(isOtherCompany(undefined, 'Taskwiser')).toBe(false);
  });
});
