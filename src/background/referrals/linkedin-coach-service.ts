import { getStorage, setStorage } from '../../shared/storage/extension-storage';
import type { AnswerQuestionsResult, FormQuestion, LinkedInCoach } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from '../jobs/candidate-profile';
import { readJobs, SUBMITTED_STATUSES } from '../jobs/job-store';
import { readReferrals } from './referral-store';

const COACH_STORAGE_KEY = 'jobfill_linkedin_coach_v1';
const RECENT_JOB_COUNT = 12;
const RECENT_REFERRAL_COUNT = 20;

const COACH_QUESTIONS: FormQuestion[] = [
  { id: 'focus', label: 'Who to reach out to this week, one sentence', kind: 'short', maxLength: 220 },
  { id: 'people', label: 'Three kinds of people to message, one per line', kind: 'long' },
  { id: 'titles', label: 'Job titles to search for, comma separated', kind: 'short', maxLength: 200 },
  { id: 'keywords', label: 'Skills or domains to search for, comma separated', kind: 'short', maxLength: 160 },
  { id: 'companies', label: 'Companies to target, comma separated', kind: 'short', maxLength: 240 },
  { id: 'plan', label: 'Today’s plan, three lines', kind: 'long' },
];

const splitList = (text = '') =>
  text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
const splitLines = (text = '') =>
  text
    .split('\n')
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean);
const todayKey = () => new Date().toISOString().slice(0, 10);

/** Turns the model's answers into lists; exported for tests. */
export function toCoach(answers: Record<string, string>, createdAt = Date.now()): LinkedInCoach {
  return {
    focus: answers.focus ?? '',
    people: splitLines(answers.people).slice(0, 3),
    titles: splitList(answers.titles).slice(0, 6),
    keywords: splitList(answers.keywords).slice(0, 5),
    companies: splitList(answers.companies).slice(0, 6),
    plan: splitLines(answers.plan).slice(0, 3),
    createdAt,
  };
}

/**
 * Today's suggestions, written once a day (or when you press Refresh) from your profile,
 * recent applications and the people you already asked.
 */
export async function getLinkedInCoach(refresh = false): Promise<LinkedInCoach> {
  const cached = await getStorage<{ day?: string; coach?: LinkedInCoach }>(COACH_STORAGE_KEY, {});
  if (!refresh && cached.day === todayKey() && cached.coach) return cached.coach;
  const [writerInput, jobs, referrals] = await Promise.all([loadWriterInput(), readJobs(), readReferrals()]);
  const recentJobs = jobs
    .filter((job) => SUBMITTED_STATUSES.includes(job.status))
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, RECENT_JOB_COUNT)
    .map((job) => `${job.jobTitle ?? 'Role'} at ${job.company ?? 'unknown company'} (${job.status})`);
  const askedPeople = referrals
    .filter((referral) => referral.status !== 'drafted')
    .slice(0, RECENT_REFERRAL_COUNT)
    .map((referral) => `${referral.personRole ?? 'Someone'} at ${referral.company ?? 'unknown'} (${referral.status})`);
  const { result } = await runTask('answer_questions', {
    ...writerInput,
    jobDescription: [
      `Jobs you applied to recently:\n${recentJobs.join('\n') || 'None yet.'}`,
      `People you already asked:\n${askedPeople.join('\n') || 'Nobody yet.'}`,
    ].join('\n\n'),
    questions: COACH_QUESTIONS,
    audience: 'linkedin-coach',
  });
  const coach = toCoach((result as AnswerQuestionsResult).answers);
  if (!coach.focus && !coach.people.length) throw new Error('No suggestions came back. Try Refresh in a moment.');
  await setStorage({ [COACH_STORAGE_KEY]: { day: todayKey(), coach } });
  return coach;
}
