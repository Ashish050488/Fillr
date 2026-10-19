import { normalizeWhitespace } from '../page/question-label';

/**
 * Ashby, Rippling, Gem and many custom forms ask Yes/No (or "How did you hear?") as a row of
 * clickable buttons instead of radios or a dropdown. They are found by shape: two to ten short
 * buttons side by side (each may sit in its own wrapper), inside a field that has a question label,
 * with no visible text box of their own. Hidden inputs that mirror the choice are allowed.
 */
export interface ChoiceButtonGroup {
  label: string;
  buttons: HTMLElement[];
}

const MINIMUM_CHOICES = 2;
const MAXIMUM_CHOICES = 10;
const MAXIMUM_CHOICE_TEXT_LENGTH = 60;
// Action buttons, never answers: YC's "Close" and "Send" sit side by side like a Yes/No row, and
// picking one would send your application.
const NOT_A_CHOICE =
  /\b(submit|apply|send|close|dismiss|done|finish|confirm|upload|attach|remove|delete|add|next|back|continue|cancel|save|edit|clear|share|sign|log ?in|message|replace)\b/i;
const SELECTED_CLASS = /(^|[_\s-])(active|selected|checked|chosen|pressed|isSelected)([_\s-]|$)/i;
const CHOICE_CANDIDATES = 'button[type="button"], button:not([type]), [role="radio"], [role="button"][aria-pressed]';
const FIELD_CONTAINER =
  '.ashby-application-form-field-entry, [class*="field-entry"], [class*="question"], [class*="Field"], [class*="field"], fieldset, li';
const LABEL_SELECTOR = 'label, legend, [class*="question-title"], [class*="label"], [class*="Label"], h3, h4, p';
const MAXIMUM_WRAPPER_DEPTH = 2;

const choiceGroupOf = new WeakMap<Element, ChoiceButtonGroup>();

export const isChoiceButton = (element: Element): boolean => choiceGroupOf.has(element);

export function isChoiceSelected(button: HTMLElement): boolean {
  return (
    button.getAttribute('aria-pressed') === 'true' ||
    button.getAttribute('aria-checked') === 'true' ||
    button.getAttribute('data-state') === 'checked' ||
    SELECTED_CLASS.test(button.className)
  );
}

const isVisible = (element: Element) => element.getClientRects().length > 0;

/** The element that sits in the row for this button: the button, or a wrapper holding only it. */
function rowItemFor(button: HTMLElement): HTMLElement {
  let item: HTMLElement = button;
  for (let depth = 0; depth < MAXIMUM_WRAPPER_DEPTH; depth += 1) {
    const parent = item.parentElement;
    if (!parent || parent.querySelectorAll(CHOICE_CANDIDATES).length !== 1) break;
    const visibleChildren = Array.from(parent.children).filter(isVisible);
    if (visibleChildren.length !== 1) break;
    item = parent;
  }
  return item;
}

function readGroupLabel(row: HTMLElement): string {
  for (let field = row.parentElement, depth = 0; field && depth < 4; field = field.parentElement, depth += 1) {
    const labelElement = Array.from(field.querySelectorAll(LABEL_SELECTOR)).find(
      (candidate) => !row.contains(candidate) && normalizeWhitespace(candidate.textContent).length > 1,
    );
    if (labelElement) return normalizeWhitespace(labelElement.textContent).slice(0, 400);
    if (field.matches(FIELD_CONTAINER)) break;
  }
  return '';
}

/** Button rows that ask a question; groups already answered are included, check isChoiceSelected. */
export function findChoiceButtonGroups(root: ParentNode = document): ChoiceButtonGroup[] {
  const seenRows = new Set<Element>();
  const groups: ChoiceButtonGroup[] = [];
  for (const candidate of Array.from(root.querySelectorAll<HTMLElement>(CHOICE_CANDIDATES))) {
    if (!isVisible(candidate) || candidate.closest('#jobfill-panel-host, form[role="search"], nav, header')) continue;
    const row = rowItemFor(candidate).parentElement;
    if (!row || seenRows.has(row)) continue;
    seenRows.add(row);
    const items = Array.from(row.children).filter(isVisible) as HTMLElement[];
    const buttons = items
      .map((item) => (item.matches(CHOICE_CANDIDATES) ? item : item.querySelector<HTMLElement>(CHOICE_CANDIDATES)))
      .filter((button): button is HTMLElement => Boolean(button));
    const texts = buttons.map((button) => normalizeWhitespace(button.textContent));
    const hasVisibleTextBox = Array.from(row.querySelectorAll('input, select, textarea')).some(
      (control) => isVisible(control) && !['radio', 'checkbox'].includes((control as HTMLInputElement).type),
    );
    const isChoiceRow =
      buttons.length >= MINIMUM_CHOICES &&
      buttons.length <= MAXIMUM_CHOICES &&
      buttons.length === items.length &&
      texts.every((text) => text && text.length <= MAXIMUM_CHOICE_TEXT_LENGTH && !NOT_A_CHOICE.test(text)) &&
      !hasVisibleTextBox;
    if (!isChoiceRow) continue;
    const label = readGroupLabel(row);
    if (!label) continue;
    const group = { label, buttons };
    buttons.forEach((button) => choiceGroupOf.set(button, group));
    groups.push(group);
  }
  return groups;
}

const normalize = (text: string | null | undefined) => normalizeWhitespace(text).toLowerCase();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The option an answer means: exact text, then an answer that starts with the option ("Yes, I am
 * happy to…" → Yes), then an option that names the answer ("LinkedIn" → "Social media (LinkedIn…)").
 */
export function chooseOptionForAnswer(optionTexts: string[], answer: string): number {
  const wanted = normalize(answer);
  if (!wanted) return -1;
  const options = optionTexts.map(normalize);
  const exact = options.indexOf(wanted);
  if (exact >= 0) return exact;
  const startsWithOption = options.findIndex((option) =>
    new RegExp(`^${escapeRegExp(option)}(\\b|[^a-z])`).test(wanted),
  );
  if (startsWithOption >= 0) return startsWithOption;
  return options.findIndex((option) => new RegExp(`\\b${escapeRegExp(wanted)}\\b`).test(option));
}

/** Click the button in this button's row that the answer means. */
export function pickChoiceButton(button: HTMLElement, answer: string): boolean {
  const group = choiceGroupOf.get(button);
  const buttons = group?.buttons ?? [button];
  const chosenIndex = chooseOptionForAnswer(
    buttons.map((rowButton) => rowButton.textContent ?? ''),
    answer,
  );
  const chosen = buttons[chosenIndex];
  if (!chosen) return false;
  if (!isChoiceSelected(chosen)) chosen.click();
  return true;
}
