import React, { useEffect, useState } from 'react';
import Dropdown from './Dropdown';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const YEARS_SHOWN = 80;
// A job applicant is at least 14, so the year list starts there instead of at this year.
const YOUNGEST_APPLICANT_AGE_YEARS = 14;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const padTwoDigits = (number: number) => String(number).padStart(2, '0');
const countDaysInMonth = (year: number, month: number) => new Date(year || 2000, month, 0).getDate();

const MONTH_OPTIONS = MONTH_NAMES.map((monthName, monthIndex) => ({
  value: padTwoDigits(monthIndex + 1),
  label: monthName,
}));
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: YEARS_SHOWN }, (_, yearOffset) => {
  const year = String(currentYear - YOUNGEST_APPLICANT_AGE_YEARS - yearOffset);
  return { value: year, label: year };
});

interface DateParts {
  day: string;
  month: string;
  year: string;
}

function splitIsoDate(value: string): DateParts {
  const match = ISO_DATE_PATTERN.exec(value);
  return match ? { year: match[1], month: match[2], day: match[3] } : { day: '', month: '', year: '' };
}

/**
 * Day, month and year as three dropdowns instead of the browser's calendar, which makes you
 * click back through years one month at a time. Stores the same YYYY-MM-DD value as before.
 */
export default function DateInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [dateParts, setDateParts] = useState<DateParts>(() => splitIsoDate(value));

  useEffect(() => {
    if (ISO_DATE_PATTERN.test(value) || !value) setDateParts(splitIsoDate(value));
  }, [value]);

  const handlePartChange = (part: keyof DateParts, partValue: string) => {
    const nextParts = { ...dateParts, [part]: partValue };
    // Picking a shorter month or a non-leap year moves an impossible day back to the last valid one.
    if (nextParts.day && nextParts.month) {
      const lastDay = countDaysInMonth(Number(nextParts.year), Number(nextParts.month));
      if (Number(nextParts.day) > lastDay) nextParts.day = padTwoDigits(lastDay);
    }
    setDateParts(nextParts);
    if (nextParts.day && nextParts.month && nextParts.year) {
      onChange(`${nextParts.year}-${nextParts.month}-${nextParts.day}`);
    }
  };

  const dayCount = dateParts.month ? countDaysInMonth(Number(dateParts.year), Number(dateParts.month)) : 31;
  const dayOptions = Array.from({ length: dayCount }, (_, dayIndex) => ({
    value: padTwoDigits(dayIndex + 1),
    label: String(dayIndex + 1),
  }));

  return (
    <div className="date-input">
      <Dropdown
        id={id}
        ariaLabel="Day"
        placeholder="Day"
        value={dateParts.day}
        options={dayOptions}
        onChange={(day) => handlePartChange('day', day)}
      />
      <Dropdown
        ariaLabel="Month"
        placeholder="Month"
        value={dateParts.month}
        options={MONTH_OPTIONS}
        onChange={(month) => handlePartChange('month', month)}
      />
      <Dropdown
        ariaLabel="Year"
        placeholder="Year"
        value={dateParts.year}
        options={YEAR_OPTIONS}
        onChange={(year) => handlePartChange('year', year)}
      />
    </div>
  );
}
