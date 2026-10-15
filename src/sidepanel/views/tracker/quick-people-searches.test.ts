import { describe, expect, it } from 'vitest';
import { buildQuickSearches, mainSkill, peopleSearchUrl } from './quick-people-searches';

describe('buildQuickSearches', () => {
  const searches = buildQuickSearches({
    skills: ['JavaScript ES6+', 'TypeScript'],
    city: 'Bengaluru, Karnataka',
    appliedCompanies: ['Initech', 'Hooli', 'Initech'],
    suggestedTitles: ['Staff Engineer'],
    suggestedCompanies: ['Stripe'],
    isWarmOnly: true,
  });

  it('starts with engineers at the companies you applied to, without repeats', () => {
    expect(searches.slice(0, 3).map((entry) => entry.label)).toEqual([
      'Engineers at Initech',
      'Engineers at Hooli',
      'Engineers at Stripe',
    ]);
  });

  it('uses your main skill and city, and only 2nd-degree people when asked', () => {
    const labels = searches.map((entry) => entry.label);
    expect(labels).toContain('Founders building with JavaScript ES6');
    expect(labels).toContain('Engineering managers in Bengaluru');
    expect(decodeURIComponent(searches[0].url)).toBe(
      'https://www.linkedin.com/search/results/people/?keywords=Initech engineer&network=["S"]',
    );
  });

  it('still works with an empty profile', () => {
    const fallback = buildQuickSearches({ skills: [], appliedCompanies: [], isWarmOnly: false });
    expect(fallback[0].label).toBe('Founders building with your stack');
    expect(fallback.every((entry) => !entry.url.includes('network'))).toBe(true);
  });
});

describe('mainSkill and peopleSearchUrl', () => {
  it('keeps the search short and clean', () => {
    expect(mainSkill(['Node.js (Express)'])).toBe('Node.js Express');
    expect(peopleSearchUrl(['CTO', '', 'Go'], false)).toBe(
      'https://www.linkedin.com/search/results/people/?keywords=CTO%20Go',
    );
  });
});
