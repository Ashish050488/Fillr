import {
  answerQuestionsSchema,
  coverLetterAnswersSchema,
  fillEmptyFieldsSchema,
  jobFactsSchema,
  jobMatchSchema,
  resumeFactsSchema,
} from '../../../shared/schemas';
import type {
  AITask,
  AITaskContext,
  AITaskResult,
  AnswerQuestionsContext,
  CoverLetterContext,
  FillEmptyFieldsContext,
  JobParsingContext,
  ResumeParsingContext,
} from '../../../shared/types';
import {
  buildFillEmptyFieldsPrompt,
  buildJobParsingPrompt,
  buildResumeParsingPrompt,
  SAFE_FIELDS,
} from './extraction-prompts';
import { cleanModelAnswers, humanize } from './humanize-text';
import {
  buildAnswerQuestionsPrompt,
  buildCoverLetterAnswerPrompt,
  buildJobMatchPrompt,
  type JobMatchContext,
} from './writing-prompts';

export { humanize } from './humanize-text';
export type { JobMatchContext } from './writing-prompts';

/** The prompt for one AI task. */
export function taskPrompt(task: AITask, context: AITaskContext, instruction = ''): string {
  if (task === 'resume_parsing') return buildResumeParsingPrompt(context as ResumeParsingContext, instruction);
  if (task === 'cover_letter_answers') return buildCoverLetterAnswerPrompt(context as CoverLetterContext);
  if (task === 'answer_questions') return buildAnswerQuestionsPrompt(context as AnswerQuestionsContext);
  if (task === 'job_parsing') return buildJobParsingPrompt(context as JobParsingContext);
  if (task === 'job_match') return buildJobMatchPrompt(context as JobMatchContext);
  return buildFillEmptyFieldsPrompt(context as FillEmptyFieldsContext);
}

/** Check and clean a model's reply for one task. Throws when the reply does not fit. */
export function validateTaskResult(task: AITask, context: AITaskContext, modelReply: unknown): AITaskResult {
  if (task === 'resume_parsing') return resumeFactsSchema.parse(modelReply);
  if (task === 'job_parsing') return jobFactsSchema.parse(modelReply);
  if (task === 'cover_letter_answers') {
    return { answer: humanize(coverLetterAnswersSchema.parse(modelReply).answer) };
  }
  if (task === 'answer_questions') {
    const { answers } = answerQuestionsSchema.parse(modelReply);
    return { answers: cleanModelAnswers((context as AnswerQuestionsContext).questions, answers) };
  }
  if (task === 'job_match') {
    const jobMatch = jobMatchSchema.parse(modelReply);
    const jobMatchContext = context as JobMatchContext;
    const isGoodFit = jobMatch.fit.score >= jobMatchContext.minScore;
    return {
      fit: jobMatch.fit,
      coverLetter: isGoodFit ? humanize(jobMatch.coverLetter) : '',
      answers: isGoodFit ? cleanModelAnswers(jobMatchContext.questions, jobMatch.answers) : {},
    };
  }
  const filledFields = fillEmptyFieldsSchema.parse(modelReply);
  const fillContext = context as FillEmptyFieldsContext;
  for (const fieldName of Object.keys(filledFields.fields)) {
    const isAllowed = SAFE_FIELDS.has(fieldName) && fillContext.fields.includes(fieldName);
    if (!isAllowed || fillContext.profileFields?.[fieldName]?.trim()) {
      throw new Error(`Do not return non-requested, populated or sensitive field: ${fieldName}`);
    }
  }
  return filledFields;
}
