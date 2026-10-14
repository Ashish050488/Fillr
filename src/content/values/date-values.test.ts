import { describe, expect, it } from 'vitest';
import { adaptValue, parseDate } from './adapt-field-value';

describe('dates', () => {
  it('writes dates in the format each field wants', () => {
    expect(adaptValue('dateOfBirth', '2001-04-23', { label: 'Date of birth', type: 'date' })).toBe('2001-04-23');
    expect(adaptValue('dateOfBirth', '2001-04-23', { label: 'Date of birth', type: 'text' })).toBe('23/04/2001');
    expect(adaptValue('dateOfBirth', '2001-04-23', { label: 'DOB (MM/DD/YYYY)', type: 'text' })).toBe('04/23/2001');
    expect(adaptValue('graduationYear', 'May 2023', { label: 'Year of passing', type: 'text' })).toBe('2023');
    expect(parseDate('23/04/2001')?.getMonth()).toBe(3);
  });

  it('turns "30 days" into an actual start date', () => {
    const value = adaptValue('earliestStart', '30 days', { label: 'Earliest start date', type: 'date' })!;
    const expected = new Date();
    expected.setDate(expected.getDate() + 30);
    const pad = (number: number) => String(number).padStart(2, '0');
    expect(value).toBe(`${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`);
  });
});
