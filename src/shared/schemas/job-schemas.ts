/** Job postings, fit analysis and tracker records as stored and as returned by AI. */
import { z } from 'zod';
import { questionSchema, titleText } from './ai-task-schemas';

const shortTextList = z.array(z.string().trim().min(1).max(600)).max(40).optional();
const optionalTrimmedText = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .optional()
    .transform((value) => value || undefined);
/** Lenient on purpose: extra keys from the model are dropped, not rejected. */
export const jobFactsSchema = z.object({
  title: optionalTrimmedText(300),
  company: optionalTrimmedText(300),
  location: optionalTrimmedText(300),
  employmentType: optionalTrimmedText(100),
  seniority: optionalTrimmedText(100),
  summary: optionalTrimmedText(2000),
  responsibilities: shortTextList,
  requirements: shortTextList,
  niceToHave: shortTextList,
  skills: shortTextList,
  values: shortTextList,
  description: optionalTrimmedText(12000),
  ats: optionalTrimmedText(40),
});
const pageScanSchema = z
  .object({
    url: z.string().url().max(2000),
    pageText: z.string().max(60000),
    jobTitle: titleText,
    company: titleText,
    questions: z.array(questionSchema).max(40),
    atsUrl: z.string().max(2000).optional(),
    signals: z
      .array(z.object({ label: z.string().max(120), tone: z.enum(['good', 'info', 'warning']) }).strict())
      .max(10)
      .optional(),
  })
  .strict();
export const jobPrepareSchema = z
  .object({
    scan: pageScanSchema,
    force: z.boolean().optional(),
    refresh: z.boolean().optional(),
    analyzeOnly: z.boolean().optional(),
  })
  .strict();
export const fitSchema = z.object({
  score: z.coerce.number().transform((value) => Math.max(0, Math.min(100, Math.round(value)))),
  verdict: z.enum(['strong', 'good', 'stretch', 'weak']).catch('stretch'),
  headline: z.string().trim().max(400).catch(''),
  matches: z
    .array(z.object({ requirement: z.string().trim().max(400), evidence: z.string().trim().max(600) }))
    .max(12)
    .catch([]),
  gaps: z.array(z.string().trim().max(400)).max(12).catch([]),
  dealbreakers: z.array(z.string().trim().max(400)).max(8).catch([]),
  tips: z.array(z.string().trim().max(400)).max(8).catch([]),
  keywords: z.array(z.string().trim().max(80)).max(20).catch([]),
});
export const jobMatchSchema = z.object({
  fit: fitSchema,
  coverLetter: z.string().max(12000).catch(''),
  answers: z.record(z.string().max(12000)).catch({}),
});
export const jobSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    url: z.string(),
    site: z.string().optional(),
    date: z.string(),
    timestamp: z.number(),
    status: z.enum(['filled', 'saved', 'applied', 'rejected', 'interview', 'offer']),
    notes: z.string().optional(),
    fieldsFilled: z.number(),
    coverLetter: z.string().optional(),
    answers: z.record(z.string()).optional(),
    asked: z.array(z.string()).optional(),
    analyzedAt: z.number().optional(),
  })
  .passthrough();
export const metricsSchema = z.object({
  totalFormsFilled: z.number(),
  totalJobsApplied: z.number(),
  totalFieldsFilled: z.number(),
  timeSavedMinutes: z.number(),
});
