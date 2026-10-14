import { parseResumeDate } from '../../shared/resume/resume-facts';
import { fillCombobox, fillListboxButton, isCombobox, isListboxButton } from '../form/searchable-dropdown';
import { findAddButton, findEntryBlocks, findLabelledControl, readText, typeInto, wait } from './workday-page';

const MAXIMUM_TEXT_LENGTH = 5000;
const ENTRY_RENDER_MILLISECONDS = 700;

/** Fill one control inside an entry: a typed field, a searchable list or a button dropdown. */
export async function fillEntryControl(
  control: HTMLElement | undefined,
  text: string,
  touched: Set<Element>,
): Promise<void> {
  if (!control || !text) return;
  let isFilled = false;
  if (isListboxButton(control)) isFilled = await fillListboxButton(control, text);
  else if (isCombobox(control)) isFilled = await fillCombobox(control, text);
  else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    isFilled = typeInto(control, text.slice(0, control.maxLength > 0 ? control.maxLength : MAXIMUM_TEXT_LENGTH));
  }
  if (isFilled) touched.add(control);
}

const describeInput = (input: HTMLInputElement) =>
  `${input.getAttribute('data-automation-id')} ${input.id} ${input.getAttribute('aria-label')}`;

/** Workday dates are a month spinner plus a year spinner, or a single MM/YYYY box. */
export async function fillEntryDate(
  scope: ParentNode,
  labelPattern: RegExp,
  resumeDate: unknown,
  touched: Set<Element>,
  isYearOnly = false,
): Promise<void> {
  const monthsSinceYearZero = parseResumeDate(readText(resumeDate));
  if (monthsSinceYearZero === undefined) return;
  const year = String(Math.floor(monthsSinceYearZero / 12));
  const month = String((monthsSinceYearZero % 12) + 1).padStart(2, '0');
  const firstControl = findLabelledControl(scope, labelPattern);
  const dateWrapper =
    firstControl?.closest('[data-automation-id^="formField"]') ?? firstControl?.parentElement?.parentElement;
  const dateInputs = Array.from(dateWrapper?.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])') ?? []);
  const monthInput = dateInputs.find((input) => /month/i.test(describeInput(input)));
  const yearInput = dateInputs.find((input) => /year/i.test(describeInput(input)));
  if (yearInput) {
    if (monthInput && !isYearOnly && typeInto(monthInput, month)) touched.add(monthInput);
    if (typeInto(yearInput, year)) touched.add(yearInput);
  } else if (dateInputs[0] && typeInto(dateInputs[0], isYearOnly ? year : `${month}/${year}`)) {
    touched.add(dateInputs[0]);
  }
}

/** "Add" clicks per section on this page: never more than one per resume item, even across passes. */
const addClickCounts = new Map<string, number>();

/** Click "Add" until there are `entryCount` entries (Workday renders them a moment later). */
export async function ensureEntryBlocks(sectionTitle: RegExp, entryCount: number): Promise<HTMLElement[]> {
  let entryBlocks = findEntryBlocks(sectionTitle);
  const budgetKey = `${location.pathname}|${sectionTitle.source}`;
  for (let attempt = 0; entryBlocks.length < entryCount && attempt < entryCount + 1; attempt += 1) {
    const addButton = findAddButton(sectionTitle);
    const clicksSoFar = addClickCounts.get(budgetKey) ?? 0;
    if (!addButton || clicksSoFar >= entryCount) break;
    addClickCounts.set(budgetKey, clicksSoFar + 1);
    addButton.click();
    await wait(ENTRY_RENDER_MILLISECONDS);
    entryBlocks = findEntryBlocks(sectionTitle);
  }
  return entryBlocks.slice(0, entryCount);
}
