/** A job posting as JobFill tracks it, from first visit to submitted application. */
import type { FitAnalysis, FormQuestion } from './ai';
import type { PostingSignal } from '../jobs/posting-signals';
import type { Profile } from './profile';

export interface PageScan {
  url: string;
  pageText: string;
  jobTitle?: string;
  company?: string;
  questions: FormQuestion[];
  /** An embedded ATS iframe, e.g. Greenhouse on a careers page. */ atsUrl?: string;
  /** Age, applicants, pay listed: read from the page without AI. */
  signals?: PostingSignal[];
}
export interface JobFacts {
  title?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  seniority?: string;
  summary?: string;
  responsibilities?: string[];
  requirements?: string[];
  niceToHave?: string[];
  skills?: string[];
  values?: string[];
  /** Clean posting text from the ATS API, used instead of the sections above. */
  description?: string;
  ats?: string;
}
export type JobStatus = 'filled' | 'saved' | 'applied' | 'rejected' | 'interview' | 'offer';
export interface Job {
  id: string;
  key?: string;
  company?: string;
  jobTitle?: string;
  url: string;
  site?: string;
  date: string;
  timestamp: number;
  status: JobStatus;
  notes?: string;
  fieldsFilled: number;
  /** Gemma's clean parse of the posting, reused for every later AI call on this job. */
  jobFacts?: JobFacts;
  analysis?: FitAnalysis;
  analyzedAt?: number;
  /** One cover letter per job, editable by the person, used for any cover-letter field. */
  coverLetter?: string;
  /** Answers keyed by normalised question label, so the apply page can reuse them. */
  answers?: Record<string, string>;
  asked?: string[];
  filledAt?: number;
  appliedAt?: number;
  /** Applied was detected from the site's confirmation, not set by hand. */
  appliedAuto?: boolean;
  /** Posting age, reposts, applicant count and pay, as last read from the page. */
  postingSignals?: PostingSignal[];
  interviewPrep?: InterviewPrep;
  tailoredResume?: TailoredResume;
}

/** Your resume's summary and best bullets rewritten in this posting's words, with keyword coverage. */
export interface TailoredResume {
  summary: string;
  bullets: Array<{ source: string; text: string }>;
  keywordsCovered: string[];
  keywordsMissing: string[];
  createdAt: number;
}

/** Likely interview questions with your matching stories, and questions to ask them. */
export interface InterviewPrep {
  questions: string[];
  stories: string[];
  askThem: string[];
  createdAt: number;
}
export interface LifetimeMetrics {
  totalFormsFilled: number;
  totalJobsApplied: number;
  totalFieldsFilled: number;
  timeSavedMinutes: number;
}
export interface BackupData {
  version?: number;
  exportedAt?: string;
  profiles?: Profile[];
  activeProfileId?: string;
  jobs?: Job[];
  metrics?: LifetimeMetrics;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}
