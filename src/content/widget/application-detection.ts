import { isYcJobUrl } from '../../shared/jobs/yc-job-brief';

const ATS_HOSTS =
  /(greenhouse\.io|lever\.co|myworkdayjobs\.com|workday\.com|ashbyhq\.com|smartrecruiters\.com|icims\.com|jobvite\.com|workable\.com|bamboohr\.com|breezy\.hr|recruitee\.com|teamtailor\.com|personio\.|rippling\.com|successfactors|taleo\.net|oraclecloud\.com|wellfound\.com|naukri\.com|instahyre\.com|cutshort\.io|indeed\.com|linkedin\.com\/jobs|dover\.com|jazzhr\.com|applytojob\.com|ycombinator\.com\/companies|workatastartup\.com)/i;
const MULTI_STEP_HOSTS =
  /(myworkdayjobs\.com|icims\.com|smartrecruiters\.com|taleo\.net|successfactors|oraclecloud\.com)/i;
const APPLY_WORDS = /\b(apply|application|resume|cv|cover letter|candidate|job|career)\b/i;

/** Show the widget only where a job application is plausible, not on every search box. */
export function looksLikeApplication(fillableFieldCount: number): boolean {
  const hasEmbeddedAts = Array.from(document.querySelectorAll('iframe')).some((frame) => ATS_HOSTS.test(frame.src));
  if (hasEmbeddedAts) return true;
  if (fillableFieldCount === 0) return false;
  if (ATS_HOSTS.test(location.href)) return true;
  // YC's apply box is a single "note to the founder": one textarea is the whole application.
  if (isYcJobUrl(location.href) && document.querySelector('textarea')) return true;
  const hasUpload = document.querySelector('input[type="file"]') !== null;
  const pageSummary = `${location.href} ${document.title} ${document.querySelector('h1, h2')?.textContent ?? ''}`;
  return fillableFieldCount >= 4 && (hasUpload || APPLY_WORDS.test(pageSummary));
}

/** Workday, iCIMS and similar swap one form for the next inside the same page. */
export function isMultiStepSite(): boolean {
  return MULTI_STEP_HOSTS.test(location.href);
}
