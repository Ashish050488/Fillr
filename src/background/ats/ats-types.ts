/** A posting read straight from an applicant tracking system's public API. */
export interface AtsJob {
  ats: string;
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;
  /** Plain text, sections separated by blank lines, capped for prompts. */
  description: string;
}

/** Reads one ATS. Returns undefined straight away when the URL belongs to a different ATS. */
export type AtsReader = (url: URL) => Promise<AtsJob | undefined> | undefined;

export type JsonObject = Record<string, unknown>;
