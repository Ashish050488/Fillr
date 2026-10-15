/**
 * Notices when an application is actually submitted, so the tracker updates itself.
 * A submit click is only a candidate: it counts once the site confirms success, either on the
 * same page (Ashby, Workable show an inline "Application submitted"), after navigating to a
 * thank-you page (Greenhouse /confirmation, Lever /thanks), or Workday's candidate home.
 * sessionStorage carries the pending submission across a same-origin page load.
 */
import { hasSuccessText, isSubmitAction, looksLikeApplicationForm, looksSubmitted } from './submission-signals';
import { readPostingUrl } from '../page/posting-url';

export { isSubmitAction, looksSubmitted } from './submission-signals';

const PENDING_KEY = 'jobfill_pending_submit';
const PENDING_LIFETIME_MILLISECONDS = 3 * 60_000;
// Workday can take a while to save the application and show your candidate home.
const CONFIRMATION_WAIT_MILLISECONDS = 90_000;
const CHECK_INTERVAL_MILLISECONDS = 800;

interface PendingSubmission {
  url: string;
  at: number;
}

function readPending(): PendingSubmission | undefined {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as PendingSubmission | null;
    return pending && Date.now() - pending.at < PENDING_LIFETIME_MILLISECONDS ? pending : undefined;
  } catch {
    return undefined;
  }
}

function writePending(pending?: PendingSubmission): void {
  try {
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* Storage blocked: same-page detection still works. */
  }
}

/**
 * Calls onApplied(originalUrl) once the site confirms. originalUrl is the application page,
 * not the thank-you page, so the tracker updates the right job.
 */
export function watchSubmissions(onApplied: (url: string) => void, isTopFrame = window.top === window): () => void {
  let checkTimer: number | undefined;
  let isConfirmed = false;
  const confirm = (pending: PendingSubmission) => {
    if (isConfirmed) return;
    isConfirmed = true;
    writePending();
    window.clearInterval(checkTimer);
    onApplied(pending.url);
  };
  const waitForConfirmation = (pending: PendingSubmission, textWasThere: boolean) => {
    const startedAt = Date.now();
    const urlBefore = location.href;
    window.clearInterval(checkTimer);
    checkTimer = window.setInterval(() => {
      if (looksSubmitted(document, urlBefore, textWasThere)) confirm(pending);
      else if (Date.now() - startedAt > CONFIRMATION_WAIT_MILLISECONDS) window.clearInterval(checkTimer);
    }, CHECK_INTERVAL_MILLISECONDS);
  };
  const startCandidate = () => {
    if (isConfirmed) return;
    // Inside an embedded form, the top page's URL is the job; the background resolves it from the tab.
    const pending = { url: isTopFrame ? readPostingUrl() : '', at: Date.now() };
    writePending(pending);
    waitForConfirmation(pending, hasSuccessText());
  };
  const handleClick = (event: Event) => {
    if (isSubmitAction(event.target as Element)) startCandidate();
  };
  const handleSubmit = (event: Event) => {
    if (looksLikeApplicationForm(event.target as HTMLFormElement)) startCandidate();
  };
  document.addEventListener('click', handleClick, true);
  document.addEventListener('submit', handleSubmit, true);

  // Arrived on a thank-you page right after submitting on the previous page.
  const pending = readPending();
  if (pending) {
    if (looksSubmitted(document)) confirm(pending);
    else waitForConfirmation(pending, false);
  }
  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('submit', handleSubmit, true);
    window.clearInterval(checkTimer);
  };
}
