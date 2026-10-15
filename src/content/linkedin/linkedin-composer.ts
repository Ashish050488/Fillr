import type { ReferralChannel } from '../../shared/types';

/**
 * The box you type in on LinkedIn. There are three kinds, and JobFill checks which one is open:
 * - a chat message to a connection (a rich text box),
 * - a free message to an Open Profile, which also has a "Subject" line,
 * - the "Add a note" box of a connection request (plain text, 200 characters).
 * JobFill types into it; it never presses Send.
 */
export interface LinkedInComposer {
  element: HTMLElement;
  channel: ReferralChannel;
  /** The Subject line of a free (Open Profile) message. */
  subjectInput?: HTMLInputElement;
}

const isVisible = (element: Element) => element.getClientRects().length > 0;
const OUR_WIDGETS = '#jobfill-referral-host, #jobfill-panel-host';
const INVITATION_WORDS = /add a note|personali[sz]e your invitation|invitation|how do you know/i;

function findMessageBody(container: ParentNode): HTMLElement | undefined {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[contenteditable="true"][role="textbox"], div[contenteditable="true"], textarea',
    ),
  ).find((box) => isVisible(box) && !box.closest(OUR_WIDGETS));
}

export function findComposer(): LinkedInComposer | undefined {
  // A free message to an Open Profile: a Subject line and a body in the same box.
  const subjectInput = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[placeholder*="subject" i], input[name="subject"]'),
  ).find(isVisible);
  const subjectContainer = subjectInput?.closest('[role="dialog"], form, section, .msg-overlay-conversation-bubble');
  const subjectBody = subjectContainer ? findMessageBody(subjectContainer) : undefined;
  if (subjectInput && subjectBody) return { element: subjectBody, channel: 'message', subjectInput };

  // A connection request note.
  const invitationNote = Array.from(
    document.querySelectorAll<HTMLTextAreaElement>('[role="dialog"] textarea, textarea[name="message"]'),
  )
    .filter(isVisible)
    .find(
      (note) => note.name === 'message' || INVITATION_WORDS.test(note.closest('[role="dialog"]')?.textContent ?? ''),
    );
  if (invitationNote) return { element: invitationNote, channel: 'invitation' };

  // A chat message; the most recently opened window sits last in the page.
  const messageBoxes = Array.from(
    document.querySelectorAll<HTMLElement>('[contenteditable="true"][role="textbox"], div[contenteditable="true"]'),
  ).filter((box) => isVisible(box) && !box.closest(OUR_WIDGETS));
  const messageBox = messageBoxes[messageBoxes.length - 1];
  return messageBox ? { element: messageBox, channel: 'message' } : undefined;
}

/** What is typed in the box now. */
export function readComposerText(composer: LinkedInComposer): string {
  const { element } = composer;
  return element instanceof HTMLTextAreaElement ? element.value : element.innerText;
}

function setPlainValue(field: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
  const prototype = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  field.focus();
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, text);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  return field.value === text;
}

/**
 * Replace the box's text the way typing would, so LinkedIn's editor notices and enables Send,
 * and fill the Subject line when there is one. False when the page refused the text.
 */
export function writeIntoComposer(composer: LinkedInComposer, text: string, subject?: string): boolean {
  if (composer.subjectInput && subject && !composer.subjectInput.value.trim())
    setPlainValue(composer.subjectInput, subject);
  const { element } = composer;
  if (element instanceof HTMLTextAreaElement) return setPlainValue(element, text);
  element.focus();
  window.getSelection()?.selectAllChildren(element);
  // The rich text box keeps its own state; insertText goes through it like a paste would.
  const isInserted = document.execCommand('insertText', false, text);
  if (!isInserted) {
    element.innerText = text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
  return element.innerText.trim().length > 0;
}
