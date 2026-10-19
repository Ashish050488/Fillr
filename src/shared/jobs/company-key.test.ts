import { describe, expect, it } from 'vitest';
import { companyKey } from './company-key';

describe('companyKey', () => {
  it('treats legal endings and punctuation as the same company', () => {
    expect(companyKey('Globex Inc.')).toBe(companyKey('globex'));
    expect(companyKey('Hitachi Solutions India Pvt. Ltd')).toBe('hitachi solutions india');
    expect(companyKey('Procter & Gamble Co.')).toBe('procter and gamble');
    expect(companyKey('N26 GmbH')).toBe('n26');
  });

  it('keeps different companies apart and handles a missing name', () => {
    expect(companyKey('Stripe')).not.toBe(companyKey('Stripe Climate'));
    expect(companyKey(undefined)).toBe('');
  });
});
