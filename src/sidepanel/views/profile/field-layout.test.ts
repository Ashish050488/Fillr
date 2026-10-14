import { describe, expect, it } from 'vitest';
import { planFullWidthFields } from './field-layout';

describe('planFullWidthFields', () => {
  it('pairs half-width fields two per row', () => {
    expect(planFullWidthFields([false, false, false, false])).toEqual([false, false, false, false]);
  });

  it('widens a field left alone before a full-width one', () => {
    // Years of experience, then Headline (full): years would sit alone.
    expect(planFullWidthFields([true, true, false, true])).toEqual([true, true, true, true]);
  });

  it('widens the last field when the count is odd', () => {
    expect(planFullWidthFields([false, false, false])).toEqual([false, false, true]);
  });

  it('keeps pairs that line up after a full-width field', () => {
    expect(planFullWidthFields([false, false, true, false, false])).toEqual([false, false, true, false, false]);
  });
});
