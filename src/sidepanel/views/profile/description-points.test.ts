import { describe, expect, it } from 'vitest';
import { splitIntoPoints } from './description-points';

describe('splitIntoPoints', () => {
  it('splits a run-on description into sentences', () => {
    const description =
      'Re-architected a scraping pipeline across 9 ATS platforms; reduced runtime from 45 to 6 minutes. Built end-to-end WhatsApp automation. Reduced AI cache storage by 97.5% (87 MB to 2.2 MB).';
    expect(splitIntoPoints(description)).toEqual([
      'Re-architected a scraping pipeline across 9 ATS platforms; reduced runtime from 45 to 6 minutes',
      'Built end-to-end WhatsApp automation',
      'Reduced AI cache storage by 97.5% (87 MB to 2.2 MB)',
    ]);
  });

  it('keeps the resume’s own bullets and line breaks', () => {
    expect(splitIntoPoints('• Built the ledger\n• Led on-call\n- Mentored two engineers.')).toEqual([
      'Built the ledger',
      'Led on-call',
      'Mentored two engineers',
    ]);
  });

  it('does not split after abbreviations or inside numbers', () => {
    expect(splitIntoPoints('Used tools e.g. Kafka and Redis at 2.5x scale.')).toEqual([
      'Used tools e.g. Kafka and Redis at 2.5x scale',
    ]);
  });
});
