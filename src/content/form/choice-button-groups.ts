import { normalizeWhitespace } from '../page/question-label';

/**
 * Ashby (and some other ATSs) ask Yes/No questions as a row of plain buttons instead of radios
 * or a dropdown. These are found by shape: two to six short buttons side by side, inside a field
 * that has a question label, with no real input of their own.
 */
export interface ChoiceButtonGroup {
  label: string;
  buttons: HTMLButtonElement[];
}

const MINIMUM_CHOICES = 2;
const MAXIMUM_CHOICES = 6;
const MAXIMUM_CHOICE_TEXT_LENGTH = 40;
// Action buttons, never answers: YC's "Close" and "Send" sit side by side like a Yes/No row, and
// picking one would send your application.
const NOT_A_CHOICE =
  /\b(submit|apply|send|close|dismiss|done|finish|confirm|upload|attach|remove|delete|add|next|back|continue|cancel|save|edit|clear|share|sign|log ?in|message)\b/i;
const SELECTED_CLASS = /(^|[_\s-])(active|selected|checked|chosen|pressed)([_\s-]|$)/i;
const FIELD_CONTAINER =
  '.ashby-application-form-field-entry, [class*="field-entry"], [class*="question"], fieldset, li';
const LABEL_SELECTOR = 'label, legend, [class*="question-title"], [class*="label"], h3, h4';

const choiceButtons = new WeakSet<Element>();

export const isChoiceButton = (element: Element): element is HTMLButtonElement => choiceButtons.has(element);

export function isChoiceSelected(button: HTMLButtonElement): boolean {
  return button.getAttribute('aria-pressed') === 'true' || SELECTED_CLASS.test(button.className);
}

function readGroupLabel(group: HTMLElement): string {
  const field = group.closest(FIELD_CONTAINER) ?? group.parentElement;
  const labelElement = Array.from(field?.querySelectorAll(LABEL_SELECTOR) ?? []).find(
    (candidate) => !group.contains(candidate),
  );
  return normalizeWhitespace(labelElement?.textContent).slice(0, 400);
}

/** Button rows that ask a question; groups already answered are included, check isChoiceSelected. */
export function findChoiceButtonGroups(root: ParentNode = document): ChoiceButtonGroup[] {
  const seenRows = new Set<Element>();
  const groups: ChoiceButtonGroup[] = [];
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('button[type="button"]'))) {
    const row = button.parentElement;
    if (!row || seenRows.has(row) || row.closest('#jobfill-panel-host')) continue;
    seenRows.add(row);
    const buttons = Array.from(row.children).filter(
      (child): child is HTMLButtonElement => child instanceof HTMLButtonElement,
    );
    const texts = buttons.map((rowButton) => normalizeWhitespace(rowButton.textContent));
    const isChoiceRow =
      buttons.length >= MINIMUM_CHOICES &&
      buttons.length <= MAXIMUM_CHOICES &&
      buttons.length === row.children.length &&
      texts.every((text) => text && text.length <= MAXIMUM_CHOICE_TEXT_LENGTH && !NOT_A_CHOICE.test(text)) &&
      !row.querySelector('input, select, textarea');
    if (!isChoiceRow) continue;
    const label = readGroupLabel(row);
    if (!label) continue;
    buttons.forEach((rowButton) => choiceButtons.add(rowButton));
    groups.push({ label, buttons });
  }
  return groups;
}

/** Click the button whose text matches the answer. */
export function pickChoiceButton(button: HTMLButtonElement, answer: string): boolean {
  const normalize = (text: string | null) => normalizeWhitespace(text).toLowerCase();
  if (normalize(button.textContent) !== normalize(answer)) return false;
  if (!isChoiceSelected(button)) button.click();
  return true;
}
