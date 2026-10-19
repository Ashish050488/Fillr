/** How a recipe field is filled. */
export type RecipeFieldKind =
  /** A plain input or textarea. */
  | 'text'
  /** A file input that takes your resume PDF. */
  | 'resume'
  /** Type a short query (the city before the comma), then click the suggestion that matches. */
  | 'autocomplete'
  /** Click to open a custom dropdown, then click the option that matches. */
  | 'choice';

export interface RecipeField {
  /** The profile value to use ("firstName", "location", "country"…). Unused for 'resume'. */
  profileKey: string;
  kind: RecipeFieldKind;
  /** Tried in order; " >>> " steps into a shadow root. */
  selectors: string[];
  /** Where the suggestions or options appear (searched deeply); defaults to the whole page. */
  optionScope?: string;
  /** The option elements inside that scope. */
  optionSelector?: string;
}

export interface SiteRecipe {
  name: string;
  hostPattern: RegExp;
  /** Seen only on this ATS, for company career sites that embed it on their own domain. */
  markerSelector?: string;
  fields: RecipeField[];
  /**
   * Sites that read your resume and overwrite the form with what they found: wait this long
   * after attaching it, then fill, so your saved details win.
   */
  resumeParseWaitMilliseconds?: number;
  /** Elements that only appear once an application has been sent. */
  successSelectors: string[];
}
