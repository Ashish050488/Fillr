import { questionLabel } from '../page/question-label';
import { fillElement } from './set-field-value';

/**
 * Date pickers ("Pick date…" on Ashby, react-datepicker, MUI, Flatpickr): a text box that opens a
 * calendar and only counts a day you click. Never a place for AI prose.
 */
const DATE_HINT =
  /\b(pick|select|choose|enter) (a )?date\b|\b(dd|mm)[ ./-]+(mm|dd)[ ./-]+(yy|yyyy)\b|\byyyy[ ./-]+mm\b/i;
const DATE_LABEL = /\bdate\b|\bdob\b|\bbirthday\b/i;
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const MONTH_HEADER = new RegExp(`\\b(${MONTH_NAMES.join('|')})\\s+(\\d{4})\\b`, 'i');
const POLL_MILLISECONDS = 100;
const CALENDAR_WAIT_MILLISECONDS = 1500;
const MAXIMUM_MONTH_STEPS = 24;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const isVisible = (element: Element) => element.getClientRects().length > 0;

/** A text box's own hints (type, placeholder, aria-label, class) say it takes a date. */
export function hasDateHints(type: string, hints: string): boolean {
  if (type === 'date') return true;
  if (!['text', ''].includes(type)) return false;
  return DATE_HINT.test(hints) || /date-?picker|datepicker/i.test(hints);
}

export function isDatePickerField(element: Element): boolean {
  if (element.tagName !== 'INPUT') return false;
  const input = element as HTMLInputElement;
  const hints = `${input.placeholder} ${element.getAttribute('aria-label') ?? ''} ${input.className}`;
  if (hasDateHints(input.type, hints)) return true;
  if (!['text', ''].includes(input.type)) return false;
  const opensPopup = ['dialog', 'grid', 'true'].includes(element.getAttribute('aria-haspopup') ?? '');
  const label = questionLabel(element);
  // "Preferred Start Date", "Date available": a short question that is just a date.
  const asksForADate =
    /\b(start|joining|availability|available|birth) date\b|^date\b/i.test(label) && label.length < 60;
  return asksForADate || (opensPopup && DATE_LABEL.test(label));
}

function clickLikeAPerson(element: Element): void {
  const MouseEventConstructor = element.ownerDocument.defaultView?.MouseEvent ?? MouseEvent;
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    element.dispatchEvent(new MouseEventConstructor(type, { bubbles: true, composed: true, cancelable: true }));
  }
}

const MINIMUM_DAY_CELLS = 28;
const countDayCells = (container: Element) =>
  Array.from(container.querySelectorAll('[role="gridcell"], td, button')).filter((cell) =>
    /^\d{1,2}$/.test((cell.textContent ?? '').trim()),
  ).length;

/** The open calendar's month, read from its visible "October 2026" heading. */
function readShownMonth(): { calendar: Element; monthIndex: number } | undefined {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, span, strong, button')).filter(
    (element) => element.children.length === 0 && MONTH_HEADER.test(element.textContent ?? '') && isVisible(element),
  );
  for (const heading of headings) {
    const [, monthName = '', year = '0'] = (heading.textContent ?? '').match(MONTH_HEADER) ?? [];
    // The calendar is the heading's nearest ancestor (a few levels up) that also holds a day grid.
    let calendar: Element | null = heading.parentElement;
    for (let depth = 0; calendar && countDayCells(calendar) < MINIMUM_DAY_CELLS && depth < 6; depth += 1)
      calendar = calendar.parentElement;
    if (calendar && countDayCells(calendar) >= MINIMUM_DAY_CELLS)
      return { calendar, monthIndex: Number(year) * 12 + MONTH_NAMES.indexOf(monthName.toLowerCase()) };
  }
  return undefined;
}

function findArrow(calendar: Element, direction: 'next' | 'previous'): HTMLElement | undefined {
  const labelled = calendar.querySelector<HTMLElement>(
    direction === 'next' ? '[aria-label*="next" i], [title*="next" i]' : '[aria-label*="prev" i], [title*="prev" i]',
  );
  if (labelled) return labelled;
  // Unlabelled arrows: the two icon buttons before the grid, previous first.
  const iconButtons = Array.from(calendar.querySelectorAll<HTMLElement>('button')).filter(
    (button) => !(button.textContent ?? '').trim(),
  );
  return direction === 'next' ? iconButtons[1] : iconButtons[0];
}

/** This month's cell for the day: grids also show the tail of the last month and start of the next. */
function findDayCell(calendar: Element, day: number): HTMLElement | undefined {
  const cells = Array.from(
    calendar.querySelectorAll<HTMLElement>('[role="gridcell"], td, button, [class*="day"]'),
  ).filter((cell) => /^\d{1,2}$/.test((cell.textContent ?? '').trim()) && isVisible(cell));
  const uniqueCells = cells.filter((cell) => !cells.some((other) => other !== cell && cell.contains(other)));
  const firstOfMonth = uniqueCells.findIndex((cell) => (cell.textContent ?? '').trim() === '1');
  const monthCells = uniqueCells.slice(firstOfMonth);
  const nextMonthStart = monthCells.findIndex((cell, index) => index > 0 && (cell.textContent ?? '').trim() === '1');
  const thisMonth = nextMonthStart > 0 ? monthCells.slice(0, nextMonthStart) : monthCells;
  return thisMonth.find(
    (cell) =>
      Number((cell.textContent ?? '').trim()) === day &&
      cell.getAttribute('aria-disabled') !== 'true' &&
      !(cell as HTMLButtonElement).disabled,
  );
}

/** Open the calendar, step to the month and click the day. Falls back to typing the date. */
export async function fillDatePicker(input: HTMLInputElement, date: Date, typedValue: string): Promise<boolean> {
  if (input.type === 'date') return fillElement(input, typedValue);
  input.focus();
  clickLikeAPerson(input);
  let shown = readShownMonth();
  for (let elapsed = 0; !shown && elapsed < CALENDAR_WAIT_MILLISECONDS; elapsed += POLL_MILLISECONDS) {
    await wait(POLL_MILLISECONDS);
    shown = readShownMonth();
  }
  if (!shown) return fillElement(input, typedValue);
  const targetMonth = date.getFullYear() * 12 + date.getMonth();
  for (let step = 0; shown && shown.monthIndex !== targetMonth && step < MAXIMUM_MONTH_STEPS; step += 1) {
    const arrow = findArrow(shown.calendar, shown.monthIndex < targetMonth ? 'next' : 'previous');
    if (!arrow) break;
    clickLikeAPerson(arrow);
    await wait(POLL_MILLISECONDS * 2);
    shown = readShownMonth();
  }
  const dayCell = shown?.monthIndex === targetMonth ? findDayCell(shown.calendar, date.getDate()) : undefined;
  if (!dayCell) return fillElement(input, typedValue);
  clickLikeAPerson(dayCell);
  await wait(POLL_MILLISECONDS * 2);
  return Boolean(input.value.trim());
}
