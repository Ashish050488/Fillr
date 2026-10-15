import { isFounderNoteSite } from '../../shared/jobs/founder-note-sites';
import { findCompanyName } from '../../shared/jobs/note-recipient';

// /jobs/4844728-software-engineer (Wellfound, Work at a Startup) or /companies/zudo/jobs/AeLB (YC).
const SINGLE_JOB_PATH = /\/jobs\/[A-Za-z0-9][\w-]*\/?$/;
const OPEN_POPUP = '[role="dialog"], [aria-modal="true"], [class*="modal" i]';

/** On a Wellfound or YC search list, the popup you are applying in: the only part about this job. */
export function findListApplyPopup(): HTMLElement | undefined {
  if (!isFounderNoteSite(location.href) || SINGLE_JOB_PATH.test(location.pathname)) return undefined;
  return (
    Array.from(document.querySelectorAll<HTMLElement>(OPEN_POPUP)).find((popup) => popup.querySelector('textarea')) ??
    undefined
  );
}

/**
 * The address that identifies the job you are applying to. On Wellfound and YC you can apply from a
 * search list, where every job shares the list's address: then the job's own link in the apply
 * popup, or the company it names ("Reach out to Vedant at Salus"), keeps each job separate.
 */
export function readPostingUrl(): string {
  const popup = findListApplyPopup();
  if (!popup) return location.href;
  const jobLink = Array.from(popup.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]')).find((link) =>
    SINGLE_JOB_PATH.test(new URL(link.href, location.href).pathname),
  );
  if (jobLink) return new URL(jobLink.href, location.href).href;
  const companyName = findCompanyName(popup.innerText);
  if (!companyName) return location.href;
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${location.origin}${location.pathname}?id=${encodeURIComponent(companySlug)}`;
}
