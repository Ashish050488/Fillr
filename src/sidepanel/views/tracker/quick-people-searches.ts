/**
 * One-click LinkedIn people searches built from what JobFill already knows: your main skill,
 * your city, the companies you applied to and today's suggestions. No typing needed.
 */
export interface QuickSearchInput {
  skills: string[];
  city?: string;
  appliedCompanies: string[];
  suggestedTitles?: string[];
  suggestedCompanies?: string[];
  /** Only people you share a connection with (2nd degree): the warmest to ask. */
  isWarmOnly: boolean;
}

export interface QuickSearch {
  label: string;
  url: string;
}

const MAXIMUM_COMPANY_SEARCHES = 3;
const MAXIMUM_SEARCHES = 8;

/** "JavaScript ES6+" → "JavaScript ES6": one or two clean words search better than a long phrase. */
export function mainSkill(skills: string[]): string {
  return (skills[0] ?? '')
    .replace(/[^\w\s.#-]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
    .trim();
}

export function peopleSearchUrl(words: string[], isWarmOnly: boolean): string {
  const keywords = words
    .map((word) => word.trim())
    .filter(Boolean)
    .join(' ');
  const warmFilter = isWarmOnly ? `&network=${encodeURIComponent('["S"]')}` : '';
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}${warmFilter}`;
}

export function buildQuickSearches(input: QuickSearchInput): QuickSearch[] {
  const skill = mainSkill(input.skills);
  const city = input.city?.split(',')[0]?.trim() ?? '';
  const search = (label: string, words: string[]) => ({ label, url: peopleSearchUrl(words, input.isWarmOnly) });
  const companies = [...new Set([...input.appliedCompanies, ...(input.suggestedCompanies ?? [])].filter(Boolean))];
  const searches: QuickSearch[] = [
    // A referral moves an application you already sent: engineers at those companies first.
    ...companies
      .slice(0, MAXIMUM_COMPANY_SEARCHES)
      .map((company) => search(`Engineers at ${company}`, [company, 'engineer'])),
    search(`Founders building with ${skill || 'your stack'}`, ['founder', skill]),
    search(`CTOs at ${skill || 'tech'} startups`, ['CTO', 'startup', skill]),
    ...(city ? [search(`Engineering managers in ${city}`, ['engineering manager', city])] : []),
    search(`Recruiters hiring ${skill || 'engineers'}${city ? ` in ${city}` : ''}`, [
      'technical recruiter',
      skill,
      city,
    ]),
    ...(input.suggestedTitles ?? [])
      .slice(0, 2)
      .map((title) => search(`${title}s, ${skill || 'your field'}`, [title, skill])),
  ];
  const seenLabels = new Set<string>();
  return searches
    .filter((entry) => !seenLabels.has(entry.label) && seenLabels.add(entry.label))
    .slice(0, MAXIMUM_SEARCHES);
}
