import type { FillStage } from './fill-report';

export interface FillResult {
  success: boolean;
  filledCount: number;
  aiCount?: number;
  skippedCount: number;
  totalCount: number;
  message: string;
  skipped?: string[];
  aiError?: string;
  /** Questions were held back because the fit is weak. */
  held?: boolean;
  score?: number;
}

/** The job a form belongs to. Inside an embedded iframe, this comes from the parent page. */
export interface JobContext {
  url: string;
  pageText: string;
  jobTitle?: string;
  company?: string;
  atsUrl?: string;
}

export interface FillOptions {
  /** "Fill anyway": write answers even for a weak fit. */
  force?: boolean;
  onProgress?: (text: string) => void;
  /** Moves the widget's progress bar: reading the page, your details, answers, checking. */
  onStage?: (stage: FillStage) => void;
  /** Automatic re-fill on a new step: never touch a field this page already tried. */
  auto?: boolean;
  /** Set when filling inside an iframe: the posting lives in the parent page. */
  context?: JobContext;
}
