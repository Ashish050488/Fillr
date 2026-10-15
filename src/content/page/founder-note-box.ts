import { isFounderNoteSite } from '../../shared/jobs/founder-note-sites';
import { findRecipientName } from '../../shared/jobs/note-recipient';
import { normalizeWhitespace } from './question-label';

const MAXIMUM_ANCESTOR_DEPTH = 8;
const MAXIMUM_SURROUNDING_TEXT_LENGTH = 4000;
const MAXIMUM_NAME_WORDS = 4;
const NOTE_LABEL =
  /\b(note|message|conversation|reach out|about (you|yourself|me)|looking for|my name is|cover letter|introduce|interests? you|why)\b/i;

export interface FounderNoteBox {
  /** What the AI is told this box is, including who it is for. */
  label: string;
  recipientFirstName?: string;
}

/**
 * On YC and Wellfound the first message box is a note to a person ("Reach out to Akash at Zudo"),
 * and the name is in a heading nearby, not in the box's label. Questions ending in "?" are not it.
 */
export function readFounderNoteBox(element: Element, ownLabel: string): FounderNoteBox | undefined {
  if (!(element instanceof HTMLTextAreaElement) || !isFounderNoteSite(location.href)) return undefined;
  // The words above Wellfound's box are your own name ("Ashish Ranjan"), not a question: a short
  // label that is not a question is the note box too. "Tell us about a project you led." is not.
  // Wellfound's only label can be its sample text ("Hi! My name is Ashish and here's a little bit
  // about me..."). The first message box in the apply popup is the note whatever its label says.
  const isQuestion = ownLabel.trim().endsWith('?');
  const popup = element.closest('[role="dialog"], [aria-modal="true"], form') ?? document;
  const isFirstBox = popup.querySelector('textarea') === element;
  const looksLikeNote =
    isFirstBox || NOTE_LABEL.test(ownLabel) || ownLabel.trim().split(/\s+/).length <= MAXIMUM_NAME_WORDS;
  if (isQuestion || !looksLikeNote) return undefined;
  let recipientFirstName: string | undefined;
  let ancestor: Element | null = element.parentElement;
  for (let depth = 0; ancestor && depth < MAXIMUM_ANCESTOR_DEPTH && !recipientFirstName; depth += 1) {
    const surroundingText = (ancestor as HTMLElement).innerText ?? ancestor.textContent ?? '';
    if (surroundingText.length > MAXIMUM_SURROUNDING_TEXT_LENGTH) break;
    recipientFirstName = findRecipientName(surroundingText);
    ancestor = ancestor.parentElement;
  }
  recipientFirstName ??= findRecipientName(document.title);
  // Never pass the stray label (your own name) on as if it were what the box asks.
  // Wellfound's sample text ("Hi! My name is…") would be copied word for word; never pass it on.
  const isSampleText = /\b(my name is|here's a little)\b|^\s*(hi|hello|hey)\b/i.test(ownLabel);
  const description =
    NOTE_LABEL.test(ownLabel) && !isSampleText ? normalizeWhitespace(ownLabel) : 'Note to the founder';
  return {
    label: recipientFirstName
      ? `Founder note to ${recipientFirstName}: start with "Hi ${recipientFirstName},". ${description}`
      : description,
    ...(recipientFirstName ? { recipientFirstName } : {}),
  };
}
