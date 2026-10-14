import { toDays } from './number-parsing';

/** "2001-04-23", "23/04/2001", "April 2026", "2026" → a Date (day-first, as in India and Europe). */
export function parseDate(dateText: string): Date | undefined {
  const trimmedText = dateText.trim();
  const isoMatch = trimmedText.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3] ?? 1));
  const dayFirstMatch = trimmedText.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dayFirstMatch) return new Date(Number(dayFirstMatch[3]), Number(dayFirstMatch[2]) - 1, Number(dayFirstMatch[1]));
  const yearMatch = trimmedText.match(/^(\d{4})$/) ?? trimmedText.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch && trimmedText.length <= 4) return new Date(Number(yearMatch[1]), 0, 1);
  const parsedTimestamp = Date.parse(trimmedText);
  if (!Number.isNaN(parsedTimestamp)) return new Date(parsedTimestamp);
  return yearMatch ? new Date(Number(yearMatch[1]), 0, 1) : undefined;
}

/** "Immediately", "2 weeks", "1 month" or a date → the actual calendar date. */
export function calculateStartDate(availabilityText: string): Date | undefined {
  const days = toDays(availabilityText);
  if (days !== undefined && !/\d{4}/.test(availabilityText)) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    return startDate;
  }
  return parseDate(availabilityText);
}

/** Native date inputs need ISO; text fields follow their placeholder, else day/month/year. */
export function formatDateForField(date: Date, field: { type: string; label: string }): string {
  const padTwoDigits = (datePart: number) => String(datePart).padStart(2, '0');
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  if (field.type === 'date') return `${year}-${month}-${day}`;
  if (field.type === 'month') return `${year}-${month}`;
  const formatHint = field.label.toLowerCase();
  if (/mm\s*\/\s*dd/.test(formatHint)) return `${month}/${day}/${year}`;
  if (/yyyy\s*-\s*mm/.test(formatHint)) return `${year}-${month}-${day}`;
  if (/mm\s*\/\s*yyyy/.test(formatHint)) return `${month}/${year}`;
  return `${day}/${month}/${year}`;
}
