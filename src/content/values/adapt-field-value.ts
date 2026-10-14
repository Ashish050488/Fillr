/**
 * Turn a saved profile value into what this particular field expects:
 * notice period in days/weeks/months, experience in years/months, salary in LPA/monthly/annual,
 * and the closest option in dropdowns such as "0-2 years" or "Immediate / 15 days / 1 month".
 */
import { properName } from '../../shared/resume/resume-facts';
import { normalise } from '../form/match-profile-field';
import { calculateStartDate, formatDateForField, parseDate } from './date-values';
import { matchOption } from './match-option';
import { findDurationUnit, formatAmount, roundToStep, toAnnualAmount, toDays } from './number-parsing';
import { closestOption, daysFromUnit, lakhsFromUnit, yearsFromUnit } from './option-ranges';

export { calculateStartDate, parseDate } from './date-values';
export { declineOption, matchOption } from './match-option';
export { toAnnualAmount, toDays } from './number-parsing';
export { closestOption } from './option-ranges';

/** What a form field asks for and accepts. */
export interface FieldShape {
  label: string;
  type: string;
  options?: string[];
  maxLength?: number;
  /** The form asks for the phone country code in a field of its own. */
  dialCodeField?: boolean;
}

const NAME_FIELDS = ['name', 'firstname', 'middlename', 'lastname', 'preferredname'];
const DATE_FIELDS = ['dateofbirth', 'earlieststart', 'graduationyear'];
const RUPEES_PER_LAKH = 1e5;

function adaptNoticePeriod(savedText: string, field: FieldShape): string | undefined {
  const days = toDays(savedText);
  if (days === undefined) return field.options ? undefined : savedText;
  if (field.options) return closestOption(field.options, days, daysFromUnit);
  const unit = findDurationUnit(field.label);
  if (unit === 'weeks') return formatAmount(roundToStep(days / 7, 1));
  if (unit === 'months') return formatAmount(roundToStep(days / 30));
  if (unit === 'days' || field.type === 'number') return String(days);
  if (days === 0) return 'Immediate';
  return days % 30 === 0 ? `${days / 30} month${days === 30 ? '' : 's'}` : `${days} days`;
}

function adaptExperience(savedText: string, field: FieldShape): string | undefined {
  const years = Number(savedText.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(years)) return savedText;
  if (field.options) return closestOption(field.options, years, yearsFromUnit);
  if (findDurationUnit(field.label) === 'months') return String(Math.round(years * 12));
  // Many forms reject decimals or want whole years.
  const wantsWholeYears = field.type === 'number' || /\bwhole\b|integer/.test(normalise(field.label));
  return wantsWholeYears ? String(Math.floor(years)) : formatAmount(years);
}

function adaptSalary(savedText: string, field: FieldShape): string | undefined {
  const annualAmount = toAnnualAmount(savedText);
  if (annualAmount === undefined) return savedText;
  if (field.options) return closestOption(field.options, annualAmount / RUPEES_PER_LAKH, lakhsFromUnit);
  const label = normalise(field.label);
  if (/\b(lpa|lakhs?|lacs?|in l)\b/.test(label))
    return formatAmount(Number((annualAmount / RUPEES_PER_LAKH).toFixed(2)));
  if (/\b(per month|monthly|in hand)\b/.test(label)) return String(Math.round(annualAmount / 12));
  if (/\b(in thousands|in k|k usd|000s)\b/.test(label)) return String(Math.round(annualAmount / 1e3));
  if (/\b(crore|cr)\b/.test(label)) return formatAmount(Number((annualAmount / 1e7).toFixed(2)));
  return field.type === 'number' || /^\d[\d,.]*$/.test(savedText.trim()) ? String(Math.round(annualAmount)) : savedText;
}

function adaptPhone(savedText: string, field: FieldShape): string {
  const allDigits = savedText.replace(/[^\d]/g, '');
  const nationalNumber = savedText.replace(/^\s*\+\d{1,3}[\s-]*/, '').replace(/[^\d]/g, '');
  const wantsNationalNumber =
    field.dialCodeField ||
    /without (the )?(country|dial|isd) code|10 digit/.test(normalise(field.label)) ||
    (field.maxLength !== undefined && field.maxLength > 0 && field.maxLength < allDigits.length);
  if (wantsNationalNumber) return nationalNumber;
  return field.type === 'number' ? allDigits : savedText;
}

function adaptDialCode(savedText: string, field: FieldShape): string | undefined {
  const dialDigits = savedText.replace(/[^\d]/g, '');
  if (!field.options) return `+${dialDigits}`;
  const dialPattern = new RegExp(`\\+\\s*${dialDigits}(?!\\d)`);
  const matchingOptions = field.options.filter(
    (option) => dialPattern.test(option) || normalise(option) === dialDigits,
  );
  if (matchingOptions.length === 1) return matchingOptions[0];
  return matchingOptions.find((option) => /india|united states|united kingdom/i.test(option)) ?? matchingOptions[0];
}

function adaptDate(fieldKey: string, savedText: string, field: FieldShape): string | undefined {
  const date = fieldKey === 'earlieststart' ? calculateStartDate(savedText) : parseDate(savedText);
  if (!date) return field.options ? matchOption(field.options, savedText) : savedText;
  if (fieldKey === 'graduationyear' && !/date/.test(normalise(field.label))) {
    const year = String(date.getFullYear());
    return field.options ? matchOption(field.options, year) : year;
  }
  return formatDateForField(date, field);
}

/** The value to type or choose for this field, or undefined to leave it alone. */
export function adaptValue(profileKey: string, savedText: string, field: FieldShape): string | undefined {
  const fieldKey = normalise(profileKey).replace(/ /g, '');
  // Names typed in capitals ("ASHISH RANJAN") are rejected by Workday and others.
  if (NAME_FIELDS.includes(fieldKey)) {
    return field.options ? matchOption(field.options, properName(savedText)) : properName(savedText);
  }
  // Profile dropdown choices like "B.Tech / B.E." read best as their first form in a text box.
  if (fieldKey === 'degree' || fieldKey === 'fieldofstudy') {
    const alternativeForms = savedText.split(/\s+\/\s+/);
    if (field.options) return alternativeForms.map((form) => matchOption(field.options!, form)).find(Boolean);
    return alternativeForms[0];
  }
  if (fieldKey === 'noticeperiod') return adaptNoticePeriod(savedText, field);
  if (fieldKey === 'yearsexperience') return adaptExperience(savedText, field);
  if (fieldKey === 'currentctc' || fieldKey === 'expectedctc') return adaptSalary(savedText, field);
  if (fieldKey === 'phone') return adaptPhone(savedText, field);
  if (fieldKey === 'phonecountrycode') return adaptDialCode(savedText, field);
  if (DATE_FIELDS.includes(fieldKey)) return adaptDate(fieldKey, savedText, field);
  return field.options ? matchOption(field.options, savedText) : savedText;
}
