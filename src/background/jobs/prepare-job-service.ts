import { isFounderNoteSite } from '../../shared/jobs/founder-note-sites';
import type { AnswerQuestionsResult, FormQuestion, Job, JobMatchResult, PageScan } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from './candidate-profile';
import { buildPostingText } from './format-job-posting';
import { ensureJobMeta, loadJobFacts } from './job-facts-service';
import { jobKey, labelKey, updateJob } from './job-store';
import { findCoverLetterAnswer, findSavedAnswer, keyAnswersByLabel } from './saved-answers';

export { ensureJobMeta } from './job-facts-service';
export { rewriteCoverLetter } from './cover-letter-service';

/** Below this, JobFill fills only your saved details unless you choose "Fill anyway". */
export const FIT_THRESHOLD = 55;
const MAXIMUM_PAGE_TEXT_LENGTH = 12000;

export interface PrepareOptions {
  scan: PageScan;
  /** "Fill anyway": answer questions even for a weak fit. */
  force?: boolean;
  /** "Re-check": discard the saved analysis and start again. */
  refresh?: boolean;
  /** Score fit only; do not write further answers. */
  analyzeOnly?: boolean;
  onStage?: (text: string) => void;
}

export interface PreparedJob {
  job: Job;
  answers: Record<string, string>;
  /** True when questions were held back because the fit is weak. */
  held: boolean;
}

const runningPreparations = new Map<string, Promise<PreparedJob>>();

/**
 * Everything AI does for one posting, with as few calls as possible:
 * 1. The posting is cleaned once (ATS API, or Gemma for other sites).
 * 2. One Gemini call scores fit and, if the fit is good, writes the cover letter and every answer.
 * 3. Later fills (including the separate /apply page) reuse saved answers by question label.
 * 4. Only new questions, or "Fill anyway" on a weak fit, trigger another Gemini call.
 * Concurrent requests for the same job and questions share one run instead of paying twice.
 */
export function prepareJob(options: PrepareOptions): Promise<PreparedJob> {
  const questionLabels = options.scan.questions.map((question) => question.label).join('|');
  const preparationId = `${jobKey(options.scan.url)}|${options.force ? 1 : 0}|${options.refresh ? 1 : 0}|${questionLabels}`;
  const runningPreparation = runningPreparations.get(preparationId);
  if (runningPreparation) return runningPreparation;
  const preparation = prepareJobOnce(options).finally(() => runningPreparations.delete(preparationId));
  runningPreparations.set(preparationId, preparation);
  return preparation;
}

async function prepareJobOnce({ scan, force, refresh, analyzeOnly, onStage }: PrepareOptions): Promise<PreparedJob> {
  // No profile, no work: fail in milliseconds, before any record, scrape or AI call.
  const isFounderNote = isFounderNoteSite(scan.url);
  const writerInput = {
    ...(await loadWriterInput({ includePublicLinks: isFounderNote })),
    ...(isFounderNote ? { audience: 'yc-founder' as const } : {}),
  };
  let job = await ensureJobMeta(scan.url, scan);
  if (!job.jobFacts || refresh) onStage?.('Reading the job description…');
  const jobFacts = await loadJobFacts(refresh ? undefined : job, scan);
  const postingText = buildPostingText(jobFacts, scan.pageText.slice(0, MAXIMUM_PAGE_TEXT_LENGTH));
  const jobMeta = {
    jobTitle: jobFacts?.title || scan.jobTitle || job.jobTitle,
    company: jobFacts?.company || scan.company || job.company,
  };

  if (!job.analysis || refresh) {
    onStage?.('Checking your fit and writing your application…');
    const { result } = await runTask('job_match', {
      ...writerInput,
      ...jobMeta,
      jobDescription: postingText,
      questions: scan.questions,
      minScore: FIT_THRESHOLD,
    });
    const jobMatch = result as JobMatchResult;
    const isGoodFit = jobMatch.fit.score >= FIT_THRESHOLD;
    job = await updateJob(scan.url, (current) => ({
      ...current,
      ...jobMeta,
      jobFacts: jobFacts ?? current.jobFacts,
      analysis: jobMatch.fit,
      analyzedAt: Date.now(),
      coverLetter:
        jobMatch.coverLetter ||
        findCoverLetterAnswer(scan.questions, jobMatch.answers) ||
        (refresh ? undefined : current.coverLetter),
      answers: { ...(refresh ? {} : current.answers), ...keyAnswersByLabel(scan.questions, jobMatch.answers) },
      // Only questions the model was allowed to answer count as asked; a weak fit withholds them.
      asked: [
        ...new Set([
          ...(refresh ? [] : (current.asked ?? [])),
          ...(isGoodFit ? scan.questions.map((question) => labelKey(question.label)) : []),
        ]),
      ],
    }));
  } else if (jobFacts && !job.jobFacts) {
    job = await updateJob(scan.url, (current) => ({ ...current, ...jobMeta, jobFacts }));
  }

  const isGoodFit = (job.analysis?.score ?? 0) >= FIT_THRESHOLD;
  const answers: Record<string, string> = {};
  const unansweredQuestions: FormQuestion[] = [];
  for (const question of scan.questions) {
    const savedAnswer = findSavedAnswer(job, question);
    if (savedAnswer) answers[question.id] = savedAnswer;
    else if (!job.asked?.includes(labelKey(question.label))) unansweredQuestions.push(question);
  }
  const isHeldBack = !isGoodFit && !force && unansweredQuestions.length > 0;
  if (analyzeOnly || isHeldBack || !unansweredQuestions.length) return { job, answers, held: isHeldBack };

  const questionCount = unansweredQuestions.length;
  onStage?.(`Writing ${questionCount} more answer${questionCount === 1 ? '' : 's'}…`);
  const { result } = await runTask('answer_questions', {
    ...writerInput,
    ...jobMeta,
    jobDescription: postingText,
    questions: unansweredQuestions,
  });
  const newAnswers = (result as AnswerQuestionsResult).answers;
  Object.assign(answers, newAnswers);
  job = await updateJob(scan.url, (current) => ({
    ...current,
    coverLetter: current.coverLetter || findCoverLetterAnswer(unansweredQuestions, newAnswers),
    answers: { ...current.answers, ...keyAnswersByLabel(unansweredQuestions, newAnswers) },
    asked: [...new Set([...(current.asked ?? []), ...unansweredQuestions.map((question) => labelKey(question.label))])],
  }));
  return { job, answers, held: false };
}
