import { isFounderNoteSite } from '../../shared/jobs/founder-note-sites';
import { findCompanyName } from '../../shared/jobs/note-recipient';
import { normalizeWhitespace } from './question-label';

// /jobs/4844728-software-engineer (Wellfound, Work at a Startup) or /companies/zudo/jobs/AeLB (YC).
const SINGLE_JOB_PATH = /\/jobs\/[A-Za-z0-9][\w-]*\/?$/;
// Wellfound's search list keeps the open job in the address: ?job_listing_slug=4480240-junior-engineer.
const JOB_SLUG_VALUE = /^\d{3,}-[\w-]+$/;
const OPEN_POPUP = '[role="dialog"], [aria-modal="true"], [class*="modal" i]';
// A job panel holds the whole posting; the apply box's own section is much shorter.
const MINIMUM_JOB_PANEL_TEXT_LENGTH = 1500;

const isOnJobList = () => isFounderNoteSite(location.href) && !SINGLE_JOB_PATH.test(location.pathname);
const isShown = (element: Element) => element.getClientRects().length > 0;

/**
 * On a Wellfound or YC search list, the part of the page about the job you are applying to: the
 * apply popup, or the job panel open beside the list that holds the visible note box.
 */
export function findListApplyPopup(): HTMLElement | undefined {
  if (!isOnJobList()) return undefined;
  const popup = Array.from(document.querySelectorAll<HTMLElement>(OPEN_POPUP)).find((candidate) =>
    candidate.querySelector('textarea'),
  );
  if (popup) return popup;
  const noteBox = Array.from(document.querySelectorAll('textarea')).find(
    (textarea) => isShown(textarea) && !textarea.closest('#jobfill-panel-host'),
  );
  for (let panel = noteBox?.parentElement; panel && panel !== document.body; panel = panel.parentElement) {
    if (panel.querySelector('h1, h2') && panel.innerText.length >= MINIMUM_JOB_PANEL_TEXT_LENGTH) return panel;
  }
  return undefined;
}

/**
 * Where the application is: the whole page, or on a Wellfound or YC list only the open job's panel
 * (the list's search filters and chips are never questions). Undefined while no job is open.
 */
export function findApplicationScope(): ParentNode | undefined {
  return isOnJobList() ? findListApplyPopup() : document;
}

/** The open job's slug from the list's address, whatever Wellfound calls the parameter. */
export function findJobSlugInQuery(search: string): string | undefined {
  return Array.from(new URLSearchParams(search).values()).find((value) => JOB_SLUG_VALUE.test(value));
}

/**
 * The job's own link in its panel: the one titled like the posting. A panel also lists the
 * company's other openings ("Recent Jobs"), so any other link is only trusted when it is the only one.
 */
export function pickJobLink(links: Array<{ href: string; text: string }>, headings: string[]): string | undefined {
  const jobLinks = links.filter((link) => SINGLE_JOB_PATH.test(new URL(link.href).pathname));
  const titles = new Set(headings.map((heading) => normalizeWhitespace(heading).toLowerCase()).filter(Boolean));
  const titled = jobLinks.find((link) => titles.has(normalizeWhitespace(link.text).toLowerCase()));
  if (titled) return titled.href;
  const distinctLinks = new Set(jobLinks.map((link) => link.href));
  return distinctLinks.size === 1 ? jobLinks[0]!.href : undefined;
}

const slugOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The address that identifies the job you are applying to. On Wellfound and YC you can apply from a
 * search list, where every job shares the list's address: then the job's slug in the address, its
 * own link, or its company and title keep each job (and its saved answers) separate.
 */
export function readPostingUrl(): string {
  if (!isOnJobList()) return location.href;
  const querySlug = findJobSlugInQuery(location.search);
  if (querySlug) return `${location.origin}/jobs/${querySlug}`;
  const popup = findListApplyPopup();
  if (!popup) return location.href;
  const headings = Array.from(popup.querySelectorAll('h1, h2, h3')).map((heading) => heading.textContent ?? '');
  const links = Array.from(popup.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]')).map((link) => ({
    href: new URL(link.href, location.href).href,
    text: link.textContent ?? '',
  }));
  const jobLink = pickJobLink(links, headings);
  if (jobLink) return jobLink;
  const companyName = findCompanyName(popup.innerText);
  const jobId = slugOf([companyName, ...headings.slice(0, 2)].filter(Boolean).join(' '));
  if (!jobId) return location.href;
  return `${location.origin}${location.pathname}?id=${encodeURIComponent(jobId)}`;
}
