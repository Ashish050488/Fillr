import type { FormQuestion, Job } from '../../shared/types';
import { labelKey } from './job-store';

const COVER_LETTER_LABEL = /cover\s*letter|covering letter|motivation(al)? letter/i;

const isCoverLetterQuestion = (question: FormQuestion) =>
  question.kind === 'long' && COVER_LETTER_LABEL.test(question.label);

/**
 * An answer saved for this job earlier (possibly on its listing page), matched by question label.
 * Cover-letter fields always get the one editable letter saved for this company.
 */
export function findSavedAnswer(job: Job | undefined, question: FormQuestion): string | undefined {
  if (isCoverLetterQuestion(question) && job?.coverLetter) return job.coverLetter;
  const savedAnswer = job?.answers?.[labelKey(question.label)];
  if (!savedAnswer) return undefined;
  if (question.kind === 'choice') {
    return question.options?.find((option) => labelKey(option) === labelKey(savedAnswer));
  }
  return question.maxLength ? savedAnswer.slice(0, question.maxLength) : savedAnswer;
}

/** Answers re-keyed by question label, so another page asking the same thing can reuse them. */
export function keyAnswersByLabel(
  questions: FormQuestion[],
  answersById: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    questions
      .filter((question) => answersById[question.id])
      .map((question) => [labelKey(question.label), answersById[question.id]]),
  );
}

/** The answer written for a cover-letter field, if the form had one. */
export function findCoverLetterAnswer(
  questions: FormQuestion[],
  answersById: Record<string, string>,
): string | undefined {
  return questions
    .filter(isCoverLetterQuestion)
    .map((question) => answersById[question.id])
    .find(Boolean);
}
