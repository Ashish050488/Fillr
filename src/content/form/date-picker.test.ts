import { describe, expect, it } from 'vitest';
import { hasDateHints } from './date-picker';

describe('hasDateHints', () => {
  it('recognises calendar boxes by their placeholder or type', () => {
    expect(hasDateHints('text', 'Pick date...')).toBe(true);
    expect(hasDateHints('text', 'DD/MM/YYYY')).toBe(true);
    expect(hasDateHints('text', 'react-datepicker__input')).toBe(true);
    expect(hasDateHints('date', '')).toBe(true);
  });

  it('leaves ordinary text boxes alone', () => {
    expect(hasDateHints('text', 'Type here...')).toBe(false);
    expect(hasDateHints('email', 'Pick date')).toBe(false);
  });
});
