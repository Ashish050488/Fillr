import { matchOption } from '../values/adapt-field-value';
import { nativeSet } from './set-field-value';

/** React-select, Greenhouse's new boards, Lever location and similar searchable dropdowns. */
export function isCombobox(element: Element): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement) || !['text', 'search', ''].includes(element.type)) return false;
  return (
    element.getAttribute('role') === 'combobox' ||
    element.getAttribute('aria-autocomplete') === 'list' ||
    element.getAttribute('aria-haspopup') === 'listbox' ||
    Boolean(element.closest('[class*="select__control"], [class*="Select-control"]')) ||
    // Workday's multi-select prompts ("How Did You Hear About Us?", "Field of Study").
    element.getAttribute('data-automation-id') === 'searchBox' ||
    Boolean(element.closest('[data-automation-id^="multiselectInputContainer"]'))
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function visibleOptions(ownerDocument: Document, input: HTMLInputElement): HTMLElement[] {
  const owned = input.getAttribute('aria-controls') || input.getAttribute('aria-owns');
  const scope: ParentNode = (owned && ownerDocument.getElementById(owned)) || ownerDocument;
  return Array.from(
    scope.querySelectorAll<HTMLElement>(
      '[role="option"], [class*="select__option"], [class*="Select-option"], [data-automation-id="promptOption"], [data-automation-id="promptLeafNode"]',
    ),
  ).filter((option) => option.getClientRects().length > 0 && !option.getAttribute('aria-disabled')?.startsWith('t'));
}

function press(element: Element, key: string): void {
  const KeyboardEventConstructor = element.ownerDocument.defaultView?.KeyboardEvent ?? KeyboardEvent;
  element.dispatchEvent(new KeyboardEventConstructor('keydown', { key, bubbles: true, composed: true }));
}

function clickLikeAPerson(element: HTMLElement): void {
  const MouseEventConstructor = element.ownerDocument.defaultView?.MouseEvent ?? MouseEvent;
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    element.dispatchEvent(new MouseEventConstructor(type, { bubbles: true, composed: true, cancelable: true }));
  }
}

/** Type the value, wait for suggestions, and click the matching one. Leaves the field empty if nothing matches. */
/**
 * Workday shows a choice as "1 item selected, India (+91)" while its search box stays empty;
 * React-select shows a single-value chip. Either way the field is already answered.
 */
export function hasSelection(input: HTMLInputElement): boolean {
  const container =
    input.closest('[data-automation-id^="multiselectInputContainer"]')?.parentElement ??
    input.closest('[data-automation-id^="formField"]') ??
    input.closest('[class*="select__control"], [class*="Select-control"]');
  if (!container) return false;
  if (
    container.querySelector(
      '[data-automation-id="selectedItem"], [data-automation-id="selectedItemList"] [role="option"], [class*="singleValue"], [class*="multiValue"]',
    )
  )
    return true;
  return /\b[1-9]\d*\s+items?\s+selected\b/i.test(container.textContent ?? '');
}

export async function fillCombobox(input: HTMLInputElement, value: string): Promise<boolean> {
  if (input.value.trim() || input.disabled || input.readOnly || hasSelection(input)) return false;
  return searchAndPick(input, value);
}

/**
 * Type into a search box, wait for suggestions and click the match. `strict` refuses a lone
 * suggestion that is not actually a match (for skills, where a wrong pick is worse than none).
 */
export async function searchAndPick(input: HTMLInputElement, value: string, strict = false): Promise<boolean> {
  const ownerDocument = input.ownerDocument;
  input.focus();
  clickLikeAPerson(input);
  // Typing a shorter query finds more suggestions ("Bengaluru, Karnataka, India" → "Bengaluru").
  const query = value.split(/[,(]/)[0].trim().slice(0, 40);
  nativeSet(input, 'value', query);
  input.dispatchEvent(
    new (ownerDocument.defaultView?.InputEvent ?? InputEvent)('input', {
      bubbles: true,
      composed: true,
      data: query,
      inputType: 'insertText',
    }),
  );
  press(input, 'ArrowDown');
  // Workday searches only when Enter is pressed.
  if (
    input.getAttribute('data-automation-id') === 'searchBox' ||
    input.closest('[data-automation-id^="multiselectInputContainer"]')
  )
    press(input, 'Enter');
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await wait(100);
    const options = visibleOptions(ownerDocument, input);
    if (!options.length) continue;
    const texts = options.map((option) => option.textContent?.trim() ?? '');
    const chosen =
      matchOption(texts, value) ??
      matchOption(texts, query) ??
      (!strict && options.length === 1 ? texts[0] : undefined);
    if (!chosen) continue;
    clickLikeAPerson(options[texts.indexOf(chosen)]);
    await wait(60);
    return true;
  }
  // No suggestion matched: undo the typing so the form is not left half-filled.
  nativeSet(input, 'value', '');
  input.dispatchEvent(new (ownerDocument.defaultView?.Event ?? Event)('input', { bubbles: true, composed: true }));
  press(input, 'Escape');
  input.blur();
  return false;
}

const PLACEHOLDER = /^(select( one)?|choose|please select|--|none selected)?$/i;

/** Workday-style dropdown: a button showing "Select One" that opens a role=listbox. */
export function isListboxButton(element: Element): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement && element.getAttribute('aria-haspopup') === 'listbox';
}

export async function fillListboxButton(button: HTMLButtonElement, value: string): Promise<boolean> {
  const current = (button.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!PLACEHOLDER.test(current) || button.disabled) return false;
  const ownerDocument = button.ownerDocument;
  clickLikeAPerson(button);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await wait(150);
    const controlled = button.getAttribute('aria-controls');
    const scope: ParentNode = (controlled && ownerDocument.getElementById(controlled)) || ownerDocument;
    const options = Array.from(scope.querySelectorAll<HTMLElement>('[role="option"]')).filter(
      (option) => option.getClientRects().length > 0,
    );
    if (!options.length) continue;
    const texts = options.map((option) => option.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    const chosen = matchOption(texts, value);
    if (!chosen) break;
    clickLikeAPerson(options[texts.indexOf(chosen)]);
    await wait(80);
    return true;
  }
  press(ownerDocument.activeElement ?? button, 'Escape');
  return false;
}

/** Open a button dropdown just long enough to read its choices, then close it untouched. */
export async function readListboxOptions(button: HTMLButtonElement): Promise<string[]> {
  const ownerDocument = button.ownerDocument;
  clickLikeAPerson(button);
  let texts: string[] = [];
  for (let attempt = 0; attempt < 10 && !texts.length; attempt += 1) {
    await wait(100);
    const controlled = button.getAttribute('aria-controls');
    const scope: ParentNode = (controlled && ownerDocument.getElementById(controlled)) || ownerDocument;
    texts = Array.from(scope.querySelectorAll<HTMLElement>('[role="option"]'))
      .filter((option) => option.getClientRects().length > 0)
      .map((option) => option.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((option) => option && !PLACEHOLDER.test(option));
  }
  press(ownerDocument.activeElement ?? button, 'Escape');
  await wait(80);
  return texts.slice(0, 80);
}
