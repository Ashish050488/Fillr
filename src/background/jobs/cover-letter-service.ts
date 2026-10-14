import type { AnswerQuestionsResult, AnswerStyle, FormQuestion, Job } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from './candidate-profile';
import { formatJobPosting } from './format-job-posting';
import { getJobByKey, updateJob } from './job-store';

/** Rewrite this job's cover letter, e.g. in another tone, reusing the parsed posting. */
export async function rewriteCoverLetter(jobKey: string, style?: AnswerStyle): Promise<Job> {
  const job = await getJobByKey(jobKey);
  if (!job) throw new Error('Check this job first so JobFill has the posting.');
  const coverLetterQuestion: FormQuestion = { id: 'q0', label: 'Cover letter', kind: 'long' };
  const { result } = await runTask('answer_questions', {
    ...(await loadWriterInput()),
    jobTitle: job.jobTitle,
    company: job.company,
    jobDescription: job.jobFacts ? formatJobPosting(job.jobFacts) : `${job.jobTitle ?? ''} at ${job.company ?? ''}`,
    questions: [coverLetterQuestion],
    ...(style ? { style } : {}),
  });
  const coverLetter = (result as AnswerQuestionsResult).answers.q0;
  if (!coverLetter) throw new Error('The AI left the letter blank. Add more detail to your profile and try again.');
  return updateJob(job.url, (current) => ({ ...current, coverLetter }));
}
