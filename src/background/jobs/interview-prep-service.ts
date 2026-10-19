import type { AnswerQuestionsResult, FormQuestion, InterviewPrep, Job } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from './candidate-profile';
import { formatJobPosting } from './format-job-posting';
import { getJobByKey, updateJob } from './job-store';

const PREP_QUESTIONS: FormQuestion[] = [
  { id: 'questions', label: 'Six likely interview questions', kind: 'long' },
  { id: 'stories', label: 'Four stories from your resume', kind: 'long' },
  { id: 'askThem', label: 'Three questions to ask them', kind: 'long' },
];

const splitLines = (text = '', maximumLines: number) =>
  text
    .split('\n')
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, maximumLines);

/** The model's three answers as lists; exported for tests. */
export function toInterviewPrep(answers: Record<string, string>, createdAt = Date.now()): InterviewPrep {
  return {
    questions: splitLines(answers.questions, 6),
    stories: splitLines(answers.stories, 4),
    askThem: splitLines(answers.askThem, 3),
    createdAt,
  };
}

/** What the fit check found, so the prep covers where an interviewer will push. */
export function describeFitForPrep(job: Pick<Job, 'analysis'>): string {
  const fit = job.analysis;
  if (!fit) return '';
  return [
    fit.matches.length
      ? `Strengths: ${fit.matches.map((match) => `${match.requirement} (${match.evidence})`).join('; ')}`
      : '',
    fit.gaps.length || fit.dealbreakers.length
      ? `Gaps they may probe: ${[...fit.dealbreakers, ...fit.gaps].join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Writes the prep for one tracked job and saves it on the job, so it opens instantly next time. */
export async function prepareInterview(jobKeyValue: string): Promise<Job> {
  const job = await getJobByKey(jobKeyValue);
  if (!job) throw new Error('That job is no longer in your tracker.');
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
    questions: PREP_QUESTIONS,
    audience: 'interview-prep',
  });
  const interviewPrep = toInterviewPrep((result as AnswerQuestionsResult).answers);
  if (!interviewPrep.questions.length) throw new Error('No questions came back. Try again in a moment.');
  return updateJob(job.url, (current) => ({ ...current, interviewPrep }));
}
