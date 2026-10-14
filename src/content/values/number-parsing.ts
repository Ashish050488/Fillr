import { normalise } from '../form/match-profile-field';

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  a: 1,
  an: 1,
};
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

function parseFirstNumber(text: string): number | undefined {
  const digits = text.match(/\d+(?:\.\d+)?/);
  if (digits) return Number(digits[0]);
  const numberWord = normalise(text)
    .split(' ')
    .find((word) => word in WORD_NUMBERS);
  return numberWord === undefined ? undefined : WORD_NUMBERS[numberWord];
}

/** "2 months", "immediate", "15", "serving notice, 3 weeks left" → days. Bare numbers are days. */
export function toDays(durationText: string): number | undefined {
  const normalisedText = normalise(durationText);
  if (!normalisedText) return undefined;
  if (/\b(immediate|immediately|none|nil|no notice|0 days?|right away|asap)\b/.test(normalisedText)) return 0;
  const amount = parseFirstNumber(normalisedText);
  if (amount === undefined) return undefined;
  if (/\bmonths?\b|\bmos?\b/.test(normalisedText)) return Math.round(amount * DAYS_PER_MONTH);
  if (/\bweeks?\b|\bwks?\b/.test(normalisedText)) return Math.round(amount * DAYS_PER_WEEK);
  if (/\byears?\b/.test(normalisedText)) return Math.round(amount * DAYS_PER_YEAR);
  return Math.round(amount);
}

/** "12 LPA", "12 lakhs", "1.2 cr", "$120k", "12,00,000", "1,00,000 per month" → yearly amount. */
export function toAnnualAmount(salaryText: string): number | undefined {
  const plainText = salaryText.toLowerCase().replace(/,/g, '');
  const digits = plainText.match(/\d+(?:\.\d+)?/)?.[0];
  if (digits === undefined) return undefined;
  let amount = Number(digits);
  if (/\b(cr|crore)s?\b/.test(plainText)) amount *= 1e7;
  else if (/\b(l|lpa|lac|lacs|lakh|lakhs)\b/.test(plainText)) amount *= 1e5;
  else if (/\d\s*k\b|\bthousand\b/.test(plainText)) amount *= 1e3;
  else if (/\d\s*m\b|\bmillion\b/.test(plainText)) amount *= 1e6;
  if (/\b(per month|monthly|pm|\/month|a month)\b/.test(plainText)) amount *= 12;
  return amount;
}

export type DurationUnit = 'days' | 'weeks' | 'months' | 'years';

/** The unit a field label asks for, e.g. "Notice period (in weeks)". */
export function findDurationUnit(fieldLabel: string): DurationUnit | undefined {
  const normalisedLabel = normalise(fieldLabel);
  if (/\b(in|number of|no of|#) ?days?\b|\(days?\)|\bdays\b/.test(normalisedLabel)) return 'days';
  if (/\bweeks?\b/.test(normalisedLabel)) return 'weeks';
  if (/\bmonths?\b/.test(normalisedLabel)) return 'months';
  if (/\byears?\b|\byrs?\b/.test(normalisedLabel)) return 'years';
  return undefined;
}

export const roundToStep = (amount: number, step = 0.5) => Math.round(amount / step) * step;

/** 4 → "4", 1.5 → "1.5", 4.83 → "4.8". */
export const formatAmount = (amount: number) => String(Number.isInteger(amount) ? amount : Number(amount.toFixed(1)));
