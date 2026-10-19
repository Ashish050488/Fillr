/** Requests and replies for each AI task, checked before a prompt is sent and after a reply arrives. */
import { z } from 'zod';

const boundedText = z.string().trim().min(1).max(50000);
const profileFieldsSchema = z.record(z.string().trim().max(2000));
const resumeContextSchema = z.object({ resumeText: boundedText }).strict();
const coverLetterContextSchema = z
  .object({
    resumeText: boundedText,
    profileFields: profileFieldsSchema.optional(),
    jobDescription: boundedText,
    question: z.string().trim().max(10000).optional(),
    tone: z.enum(['friendly', 'professional', 'direct']).optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
    extraNote: z.string().trim().max(5000).optional(),
  })
  .strict();
const fillEmptyFieldsContextSchema = z
  .object({
    resumeText: boundedText,
    profileFields: profileFieldsSchema.optional(),
    fields: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
  })
  .strict();
export const questionSchema = z
  .object({
    id: z.string().min(1).max(100),
    label: z.string().trim().min(1).max(1000),
    kind: z.enum(['long', 'short', 'choice']),
    options: z.array(z.string().max(300)).max(80).optional(),
    maxLength: z.number().int().positive().optional(),
  })
  .strict();
export const styleSchema = z
  .object({
    tone: z.enum(['friendly', 'professional', 'direct']).optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
    extraNote: z.string().trim().max(2000).optional(),
  })
  .strict();
export const titleText = z.string().trim().max(300).optional();
const answerQuestionsContextSchema = z
  .object({
    candidate: z.record(z.unknown()),
    resumeText: z.string().max(50000).optional(),
    jobDescription: z.string().max(30000),
    jobTitle: titleText,
    company: titleText,
    questions: z.array(questionSchema).min(1).max(40),
    style: styleSchema.optional(),
    audience: z
      .enum(['yc-founder', 'linkedin-referral', 'linkedin-coach', 'interview-prep', 'profile-boost', 'resume-tailor'])
      .optional(),
  })
  .strict();
const jobParsingContextSchema = z
  .object({
    pageText: z.string().trim().min(1).max(60000),
    url: z.string().max(2000).optional(),
    pageTitle: z.string().max(500).optional(),
  })
  .strict();
export const answerQuestionsSchema = z.object({ answers: z.record(z.string().max(12000)) }).strict();
export const aiTaskRequestSchema = z.discriminatedUnion('task', [
  z.object({ task: z.literal('resume_parsing'), context: resumeContextSchema, model: z.string().optional() }).strict(),
  z
    .object({
      task: z.literal('cover_letter_answers'),
      context: coverLetterContextSchema,
      model: z.string().optional(),
    })
    .strict(),
  z
    .object({
      task: z.literal('fill_empty_fields'),
      context: fillEmptyFieldsContextSchema,
      model: z.string().optional(),
    })
    .strict(),
  z
    .object({
      task: z.literal('answer_questions'),
      context: answerQuestionsContextSchema,
      model: z.string().optional(),
    })
    .strict(),
  z.object({ task: z.literal('job_parsing'), context: jobParsingContextSchema, model: z.string().optional() }).strict(),
  z
    .object({
      task: z.literal('job_match'),
      context: answerQuestionsContextSchema
        .extend({ questions: z.array(questionSchema).max(40), minScore: z.number().int().min(0).max(100) })
        .strict(),
      model: z.string().optional(),
    })
    .strict(),
]);
export const coverLetterAnswersSchema = z.object({ answer: z.string().trim().min(1).max(12000) }).strict();
export const fillEmptyFieldsSchema = z.object({ fields: z.record(z.string().trim().max(2000)) }).strict();
export const aiTestKeySchema = z
  .object({
    provider: z.enum(['gemini', 'openrouter', 'groq']).optional(),
    key: z.string().trim().min(1).optional(),
    id: z.string().min(1).optional(),
  })
  .refine(
    (keyRequest) => Boolean(keyRequest.id || (keyRequest.provider && keyRequest.key)),
    'A key or saved key id is required',
  );
export const aiSaveKeySchema = z.object({
  provider: z.enum(['gemini', 'openrouter', 'groq']),
  key: z.string().trim().min(1),
});
