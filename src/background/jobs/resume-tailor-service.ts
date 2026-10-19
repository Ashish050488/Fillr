import type { AnswerQuestionsResult, FormQuestion, Job, TailoredResume } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from './candidate-profile';
import { formatJobPosting } from './format-job-posting';
import { describeFitForPrep } from './interview-prep-service';
import { getJobByKey, updateJob } from './job-store';

const TAILOR_QUESTIONS: FormQuestion[] = [
  { id: 'summary', label: 'Resume summary for this role', kind: 'long' },
  { id: 'bullets', label: 'Six tailored resume bullets', kind: 'long' },
  { id: 'keywordsCovered', label: 'Keywords now covered', kind: 'long' },
  { id: 'keywordsMissing', label: 'Keywords still missing', kind: 'long' },
];
const MAXIMUM_BULLETS = 6;
const MAXIMUM_KEYWORDS = 20;

const splitKeywords = (text = '') =>
  [
    ...new Set(
      text
        .split(/[,\n]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAXIMUM_KEYWORDS);

/** The model's answers as a tailored resume; exported for tests. */
export function toTailoredResume(answers: Record<string, string>, createdAt = Date.now()): TailoredResume {
  const bullets = (answers.bullets ?? '')
    .split('\n')
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, MAXIMUM_BULLETS)
    .map((line) => {
      const [source, ...rest] = line.split(' | ');
      return rest.length ? { source: source!.trim(), text: rest.join(' | ').trim() } : { source: '', text: line };
    });
  return {
    summary: (answers.summary ?? '').trim(),
    bullets,
    keywordsCovered: splitKeywords(answers.keywordsCovered),
    keywordsMissing: splitKeywords(answers.keywordsMissing),
    createdAt,
  };
}

/** Rewrites your resume's summary and best bullets for one job, and saves them on the job. */
export async function tailorResume(jobKeyValue: string): Promise<Job> {
  const job = await getJobByKey(jobKeyValue);
  if (!job) throw new Error('Check this job first so JobFill has the posting.');
  const { result } = await runTask('answer_questions', {
    ...(await loadWriterInput()),
    jobTitle: job.jobTitle,
    company: job.company,
    jobDescription: [
      job.jobFacts ? formatJobPosting(job.jobFacts) : `${job.jobTitle ?? 'Role'} at ${job.company ?? ''}`,
      describeFitForPrep(job),
    ]
      .filter(Boolean)
      .join('\n\n'),
    questions: TAILOR_QUESTIONS,
    audience: 'resume-tailor',
  });
  const tailoredResume = toTailoredResume((result as AnswerQuestionsResult).answers);
  if (!tailoredResume.summary && !tailoredResume.bullets.length)
    throw new Error('Nothing came back. Try again in a moment.');
  return updateJob(job.url, (current) => ({ ...current, tailoredResume }));
}
