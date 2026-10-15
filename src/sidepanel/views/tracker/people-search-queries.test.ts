import { describe, expect, it } from 'vitest';
import {
  buildGoogleXraySearch,
  buildLinkedInSearchUrl,
  SEARCH_COUNTRIES,
  type PeopleSearchRequest,
} from './people-search-queries';

const country = (name: string) => SEARCH_COUNTRIES.find((candidate) => candidate.name === name)!;
const request = (overrides: Partial<PeopleSearchRequest>): PeopleSearchRequest => ({
  target: 'founders',
  country: country('Germany'),
  keywords: 'AI, fintech',
  company: '',
  city: 'Berlin',
  ...overrides,
});

describe('buildGoogleXraySearch', () => {
  it('searches that country’s LinkedIn with English and local titles', () => {
    expect(buildGoogleXraySearch(request({}))).toBe(
      'site:de.linkedin.com/in ("founder" OR "co-founder" OR "CEO" OR "Gründer" OR "Geschäftsführer") ("AI" OR "fintech") "Berlin" -intitle:jobs -inurl:posts',
    );
  });

  it('uses Japanese titles for Japan and a company when given', () => {
    const query = buildGoogleXraySearch(
      request({ country: country('Japan'), target: 'engineers', company: 'Mercari', city: '', keywords: 'Go' }),
    );
    expect(query).toContain('site:jp.linkedin.com/in');
    expect(query).toContain('"エンジニア"');
    expect(query).toContain('"Mercari"');
    expect(query).toContain('"Go"');
  });

  it('drops quotes typed by you so the search does not break', () => {
    expect(buildGoogleXraySearch(request({ keywords: '"AI"', city: '' }))).toContain(' "AI" ');
  });
});

describe('countries without a subdomain', () => {
  it('searches all of LinkedIn for Anywhere, and names the United States', () => {
    expect(buildGoogleXraySearch(request({ country: country('Anywhere'), city: '' }))).toMatch(
      /^site:linkedin\.com\/in /,
    );
    expect(buildGoogleXraySearch(request({ country: country('United States'), city: '' }))).toContain(
      '"United States"',
    );
  });
});

describe('buildLinkedInSearchUrl', () => {
  it('opens LinkedIn people search with the main title, keywords and place', () => {
    expect(decodeURIComponent(buildLinkedInSearchUrl(request({ company: 'N26' })))).toBe(
      'https://www.linkedin.com/search/results/people/?keywords=founder AI fintech N26 Berlin',
    );
  });
});
