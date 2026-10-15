import { isFounderNoteSite } from '../../shared/jobs/founder-note-sites';

/** What a submit button and a "your application went through" page look like across ATSs. */
const SUBMIT_TEXT = /\b(submit|send|apply|finish|complete)\b/i;
const NOT_SUBMIT =
  /\b(search|subscribe|newsletter|log ?in|sign ?in|sign ?up|filter|next|continue|save for later|back)\b/i;
const SUCCESS_TEXT =
  /(thank(s| you) for (applying|your application|your interest|submitting)|application (has been |was |is )?(successfully )?(submitted|received|sent|complete)|we(?:'ve| have) received your application|(?:message|note|application) (?:has been |was )?sent|successfully (applied|submitted)|you(?:'ve| have) (successfully )?applied|your application is (in|on its way)|congratulations[\s\S]{0,80}application)/i;
const SUCCESS_URL =
  /\/(thanks|thank-you|thankyou|confirmation|confirmed|submitted|success|application-submitted|applied)(\/|$|\?)/i;
const MINIMUM_APPLICATION_FIELDS = 3;
const MAXIMUM_BUTTON_LABEL_LENGTH = 60;
const SCANNED_TEXT_LENGTH = 30000;

const WORKDAY_HOST = /(myworkdayjobs|myworkdaysite|myworkday)\.com$|\.wd\d+\./i;
// After Submit, Workday takes you to your candidate home, which lists the application.
const WORKDAY_SUCCESS_URL = /\/(userHome|candidateHome|home)(\/|$|\?)/i;

export const isWorkdayPage = (pageLocation: Location = location) => WORKDAY_HOST.test(pageLocation.hostname);

export const readPageText = (pageDocument: Document = document) =>
  (pageDocument.body?.innerText ?? '').slice(0, SCANNED_TEXT_LENGTH);

export const hasSuccessText = (pageDocument: Document = document) => SUCCESS_TEXT.test(readPageText(pageDocument));

/** True when the page now looks like a confirmation, not the form with errors. */
export function looksSubmitted(pageDocument: Document = document, urlBefore?: string, textWasThere = false): boolean {
  const pageLocation = pageDocument.location;
  const hasNavigated = pageLocation.href !== urlBefore;
  if (SUCCESS_URL.test(pageLocation.pathname + pageLocation.search) && hasNavigated) return true;
  if (isWorkdayPage(pageLocation) && hasNavigated && WORKDAY_SUCCESS_URL.test(pageLocation.pathname)) return true;
  // Job descriptions often already say "thank you for your interest": only new text counts.
  return !textWasThere && hasSuccessText(pageDocument);
}

/**
 * Workday's last step ("Review") has no fields, only your answers and a Submit button in the page
 * footer, so the usual "a form with a few fields" check does not apply there.
 */
function isWorkdaySubmit(button: HTMLElement, label: string): boolean {
  if (!isWorkdayPage(button.ownerDocument.location)) return false;
  const isFooterButton = /pageFooter|bottom-navigation|submit/i.test(button.getAttribute('data-automation-id') ?? '');
  return /^submit( application)?$/i.test(label) || (isFooterButton && /\bsubmit\b/i.test(label));
}

const MAXIMUM_NOTE_SEARCH_DEPTH = 8;

/**
 * YC and Wellfound: the filled-in note box beside a Send button. Their popups have no form and
 * not always a dialog role, so walk up from the button until a written note appears.
 */
export function findSentNote(button: Element): HTMLTextAreaElement | undefined {
  if (!isFounderNoteSite(button.ownerDocument.location.href)) return undefined;
  let ancestor: Element | null = button.parentElement;
  for (let depth = 0; ancestor && depth < MAXIMUM_NOTE_SEARCH_DEPTH; depth += 1) {
    const writtenNote = Array.from(ancestor.querySelectorAll('textarea')).find((note) => note.value.trim());
    if (writtenNote) return writtenNote;
    ancestor = ancestor.parentElement;
  }
  return undefined;
}

const isFounderNoteSend = (button: HTMLElement, label: string) =>
  /^(send|apply|send application|submit application|submit|send message)\b/i.test(label) &&
  findSentNote(button) !== undefined;

/**
 * YC closes the popup after Send, with no thank-you page: the note box going away (or being
 * cleared) is the confirmation. If it stays filled, Send was refused, e.g. "write at least 50 characters".
 */
export const isNoteGone = (note: HTMLTextAreaElement) =>
  !note.isConnected || note.getClientRects().length === 0 || !note.value.trim();

/** A click or submit that plausibly sends an application (not search, login or "Next"). */
export function isSubmitAction(target: Element | null): boolean {
  const button = target?.closest<HTMLElement>('button, input[type="submit"], [role="button"], a');
  if (!button) return false;
  const label =
    `${button.textContent ?? ''} ${(button as HTMLInputElement).value ?? ''} ${button.getAttribute('aria-label') ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
  if (!label || label.length > MAXIMUM_BUTTON_LABEL_LENGTH || NOT_SUBMIT.test(label) || !SUBMIT_TEXT.test(label))
    return false;
  if (isWorkdaySubmit(button, label)) return true;
  if (isFounderNoteSend(button, label)) return true;
  const form = button.closest('form') ?? button.ownerDocument;
  // Only forms that look like applications: a few fields, or a file upload.
  return (
    form.querySelectorAll('input:not([type="hidden"]), textarea, select').length >= MINIMUM_APPLICATION_FIELDS ||
    form.querySelector('input[type="file"]') !== null
  );
}

export const looksLikeApplicationForm = (form: HTMLFormElement) =>
  form.querySelectorAll('input:not([type="hidden"]), textarea, select').length >= MINIMUM_APPLICATION_FIELDS;
