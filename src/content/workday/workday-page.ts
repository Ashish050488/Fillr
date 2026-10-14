/** Finding things on a Workday application page: entry blocks, "Add" buttons and labelled fields. */
import { nativeSet, notifyChange } from '../form/set-field-value';

export const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
export const readText = (jsonField: unknown) => (typeof jsonField === 'string' ? jsonField.trim() : '');
export const normalizeLabel = (labelText: string | null | undefined) =>
  (labelText ?? '').replace(/\s+/g, ' ').replace(/\*/g, '').trim();

export function isWorkday(): boolean {
  return /myworkdayjobs\.com$|\.workday\.com$/.test(location.hostname);
}

/** Type like a person: Workday's date spinners and React inputs ignore plain value writes. */
export function typeInto(input: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
  if (!text || input.value.trim() || input.disabled || input.readOnly) return false;
  input.focus();
  let isTyped = false;
  try {
    isTyped = input.ownerDocument.execCommand('insertText', false, text);
  } catch {
    // Fall back to a direct value write below.
  }
  if (!isTyped || input.value !== text) {
    nativeSet(input, 'value', text);
    notifyChange(input);
  }
  input.blur();
  return true;
}

function headingOf(group: Element): string {
  const labelledById = group.getAttribute('aria-labelledby');
  return normalizeLabel(
    group.getAttribute('aria-label') ||
      (labelledById && group.ownerDocument.getElementById(labelledById)?.textContent) ||
      group.querySelector('h2, h3, h4, legend')?.textContent,
  );
}

/** The repeatable entry blocks of a section, e.g. "Work Experience 1", "Work Experience 2". */
export function findEntryBlocks(sectionTitle: RegExp): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="group"], fieldset'))
    .filter((group) => sectionTitle.test(headingOf(group)) && /\d/.test(headingOf(group)))
    .filter((group, _groupIndex, allGroups) => !allGroups.some((other) => other !== group && other.contains(group)));
}

/** The "Add" (or "Add Another") button belonging to a section heading. */
export function findAddButton(sectionTitle: RegExp): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
    const buttonLabel = normalizeLabel(`${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`);
    if (!/\badd\b/i.test(buttonLabel) || button.disabled) return false;
    if (sectionTitle.test(buttonLabel)) return true;
    // Plain "Add": the nearest enclosing block with a heading decides which section it adds to.
    let ancestor: HTMLElement | null = button.parentElement;
    for (let depth = 0; ancestor && depth < 6; depth += 1, ancestor = ancestor.parentElement) {
      const heading = ancestor.querySelector('h2, h3, h4');
      if (heading) return sectionTitle.test(normalizeLabel(heading.textContent));
    }
    return false;
  });
}

/** The control for a label inside one entry ("Job Title", "From", "School or University"). */
export function findLabelledControl(scope: ParentNode, labelPattern: RegExp): HTMLElement | undefined {
  const labels = Array.from(scope.querySelectorAll<HTMLElement>('label, legend, [data-automation-id="formLabel"]'));
  for (const label of labels) {
    if (!labelPattern.test(normalizeLabel(label.textContent))) continue;
    const forId = (label as HTMLLabelElement).htmlFor;
    const linkedControl = forId ? label.ownerDocument.getElementById(forId) : null;
    if (linkedControl) return linkedControl;
    const fieldWrapper = label.closest('[data-automation-id^="formField"]') ?? label.parentElement;
    const nestedControl = fieldWrapper?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, button[aria-haspopup="listbox"]',
    );
    if (nestedControl) return nestedControl;
  }
  return undefined;
}

/** The section heading a control sits under ("Resume/CV", "Cover Letter", "Skills"). */
export function sectionHeadingOf(element: Element): string {
  let ancestor: Element | null = element.parentElement;
  for (let depth = 0; ancestor && depth < 8; depth += 1, ancestor = ancestor.parentElement) {
    const heading = ancestor.querySelector('h2, h3, h4, legend, label, [data-automation-id="formLabel"]');
    if (heading && !heading.contains(element)) return normalizeLabel(heading.textContent);
  }
  return '';
}

/** Everything inside entry blocks belongs to the entry, never to the generic profile match. */
export function insideEntries(element: Element): boolean {
  return (
    isWorkday() && findEntryBlocks(/work experience|education|websites?/i).some((block) => block.contains(element))
  );
}
