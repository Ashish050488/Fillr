import { describe, expect, it } from 'vitest';
import { pickCityOption, pickNamedOption } from './pick-option';

const asOptions = (texts: string[]) => texts.map((text) => ({ option: text, text: text.toLowerCase() }));

describe('pickCityOption', () => {
  it('prefers the suggestion that also names your state and country', () => {
    const options = asOptions(['Bengaluru, Kerala, India', 'Bengaluru, Karnataka, India', 'Bengaluru Rural, India']);
    expect(pickCityOption(options, 'Bengaluru, Karnataka, India')).toBe('Bengaluru, Karnataka, India');
  });

  it('leaves the field alone when no suggestion names your city', () => {
    expect(pickCityOption(asOptions(['Berlin, Germany']), 'Bengaluru, Karnataka, India')).toBeUndefined();
  });
});

describe('pickNamedOption', () => {
  it('picks the dial code option that starts with your country', () => {
    const options = asOptions(['British Indian Ocean Territory +246', 'India +91', 'Indonesia +62']);
    expect(pickNamedOption(options, 'India')).toBe('India +91');
  });
});
