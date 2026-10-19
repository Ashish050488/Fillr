/** Your profile on a job site (Wellfound first): its fields as read, and the AI's rewrite of them. */

/** "text" is a box JobFill can rewrite; "skills" is a search box that adds one skill at a time. */
export type ProfileFieldKind = 'text' | 'skills';

export interface ProfilePageField {
  /** Stamped on the element while reading, so the panel can write back into the same box. */
  id: string;
  label: string;
  /** The heading the box sits under, e.g. "Your bio" or "Achievements". */
  section?: string;
  /** Other values in the same form, e.g. the title and company of a work experience. */
  context?: string;
  value: string;
  /** From the box itself or the "characters left" counter beside it. */
  maxLength?: number;
  kind: ProfileFieldKind;
}

export interface ProfilePageScan {
  url: string;
  site: string;
  pageText: string;
  fields: ProfilePageField[];
}

export interface ProfileBoostSuggestion {
  fieldId: string;
  label: string;
  current: string;
  suggested: string;
  maxLength?: number;
}

export interface ProfileBoost {
  site: string;
  /** Which page of the profile editor this was written for, e.g. "/profile/edit/overview". */
  page: string;
  suggestions: ProfileBoostSuggestion[];
  skillsToAdd: string[];
  tips: string[];
  createdAt: number;
}
