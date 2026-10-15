/** AI tasks: what each one receives and returns, plus key configuration. */
import type { JobFacts } from './job';
import type { ResumeFacts } from './profile';

export type AITask =
  | 'resume_parsing'
  | 'cover_letter_answers'
  | 'fill_empty_fields'
  | 'answer_questions'
  | 'job_parsing'
  | 'job_match';
export interface ResumeParsingContext {
  resumeText: string;
}
export interface CoverLetterContext {
  resumeText: string;
  profileFields?: Record<string, string>;
  jobDescription: string;
  question?: string;
  tone?: 'friendly' | 'professional' | 'direct';
  length?: 'short' | 'medium' | 'long';
  extraNote?: string;
}
export interface FillEmptyFieldsContext {
  resumeText: string;
  profileFields?: Record<string, string>;
  fields: string[];
}
export interface FormQuestion {
  id: string;
  label: string;
  kind: 'long' | 'short' | 'choice';
  options?: string[];
  maxLength?: number;
}
export interface AnswerStyle {
  tone?: 'friendly' | 'professional' | 'direct';
  length?: 'short' | 'medium' | 'long';
  extraNote?: string;
}
export interface AnswerQuestionsContext {
  candidate: Record<string, unknown>;
  resumeText?: string;
  jobDescription: string;
  jobTitle?: string;
  company?: string;
  questions: FormQuestion[];
  style?: AnswerStyle;
  /** "yc-founder": a note to a startup founder. "linkedin-referral": asking someone for a referral. */
  audience?: 'yc-founder' | 'linkedin-referral' | 'linkedin-coach';
}
export type FitVerdict = 'strong' | 'good' | 'stretch' | 'weak';
export interface FitAnalysis {
  score: number;
  verdict: FitVerdict;
  headline: string;
  matches: Array<{ requirement: string; evidence: string }>;
  gaps: string[];
  dealbreakers: string[];
  tips: string[];
  keywords: string[];
}
export interface JobMatchResult {
  fit: FitAnalysis;
  coverLetter: string;
  answers: Record<string, string>;
}
export interface JobParsingContext {
  pageText: string;
  url?: string;
  pageTitle?: string;
}
export type AITaskContext =
  | ResumeParsingContext
  | CoverLetterContext
  | FillEmptyFieldsContext
  | AnswerQuestionsContext
  | JobParsingContext;
export interface CoverLetterAnswersResult {
  answer: string;
}
export interface FillEmptyFieldsResult {
  fields: Record<string, string>;
}
export interface AnswerQuestionsResult {
  answers: Record<string, string>;
}
export type AITaskResult =
  | ResumeFacts
  | CoverLetterAnswersResult
  | FillEmptyFieldsResult
  | AnswerQuestionsResult
  | JobFacts
  | JobMatchResult;
export type AIProvider = 'gemini' | 'openrouter' | 'groq';
export interface AIKeyConfig {
  provider: AIProvider;
  key: string;
  enabled?: boolean;
}
export interface AIConfig {
  keys?: AIKeyConfig[];
  model?: Partial<Record<AIProvider, string>>;
}
