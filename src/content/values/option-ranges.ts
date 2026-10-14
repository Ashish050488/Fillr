import { normalise } from '../form/match-profile-field';

interface OptionRange {
  lowest: number;
  highest: number;
  middle: number;
}

/** Converts a number written in an option ("2" in "2 months") into the unit being compared. */
export type UnitConverter = (amount: number, optionText: string) => number;

/** Read an option like "0-2 years", "Less than 15 days", "3+ months", "Immediate" as a range. */
function readOptionRange(optionText: string, toBaseUnit: UnitConverter): OptionRange | undefined {
  const normalisedOption = normalise(optionText);
  if (/\b(immediate|immediately|serving|already serving|none|no notice)\b/.test(normalisedOption)) {
    return { lowest: 0, highest: 0, middle: 0 };
  }
  const amounts = (optionText.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!amounts.length) return undefined;
  const convert = (amount: number) => toBaseUnit(amount, normalisedOption);
  if (amounts.length >= 2 && /\b(to|and)\b|-|–/.test(optionText)) {
    const [lowest, highest] = [convert(amounts[0]), convert(amounts[1])];
    return { lowest, highest, middle: (lowest + highest) / 2 };
  }
  const amount = convert(amounts[0]);
  if (/\b(less than|under|below|upto|up to|within|max|maximum)\b|<|≤/.test(normalisedOption)) {
    return { lowest: 0, highest: amount, middle: amount / 2 };
  }
  if (/\b(more than|over|above|greater than|at least|minimum)\b|\+|>|≥/.test(optionText.toLowerCase())) {
    return { lowest: amount, highest: Number.POSITIVE_INFINITY, middle: amount * 1.5 };
  }
  return { lowest: amount, highest: amount, middle: amount };
}

/** The option whose range contains the target (narrowest wins), else the nearest one. */
export function closestOption(options: string[], target: number, toBaseUnit: UnitConverter): string | undefined {
  let bestOption: { option: string; distance: number } | undefined;
  for (const option of options) {
    const range = readOptionRange(option, toBaseUnit);
    if (!range) continue;
    const isInside = target >= range.lowest && target <= range.highest;
    const distance = isInside ? -1 / (1 + range.highest - range.lowest) : Math.abs(range.middle - target);
    if (!bestOption || distance < bestOption.distance) bestOption = { option, distance };
  }
  return bestOption?.option;
}

export const daysFromUnit: UnitConverter = (amount, optionText) =>
  /month/.test(optionText)
    ? amount * 30
    : /week/.test(optionText)
      ? amount * 7
      : /year/.test(optionText)
        ? amount * 365
        : amount;

export const yearsFromUnit: UnitConverter = (amount, optionText) =>
  /month/.test(optionText) && !/year/.test(optionText) ? amount / 12 : amount;

/** Salary options in lakhs, crores, thousands or plain rupees, all compared in lakhs. */
export const lakhsFromUnit: UnitConverter = (amount, optionText) => {
  if (/\b(cr|crore)/.test(optionText)) return amount * 100;
  if (/\bk\b|thousand/.test(optionText)) return amount / 100;
  return amount > 1000 ? amount / 1e5 : amount;
};
