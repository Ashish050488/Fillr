/**
 * Search strings for finding the right people in any country, without any AI or LinkedIn
 * automation: Google "X-ray" searches of public LinkedIn profiles (site:de.linkedin.com/in …)
 * and LinkedIn's own people search. Titles include the local words people actually use.
 */
export type PeopleTarget = 'founders' | 'engineeringLeaders' | 'hiringManagers' | 'recruiters' | 'engineers';

export interface SearchCountry {
  name: string;
  /** LinkedIn's country subdomain, e.g. "de" for de.linkedin.com. */
  subdomain: string;
  /** Local-language titles, added beside the English ones. */
  localTitles: Partial<Record<PeopleTarget, string[]>>;
}

export const SEARCH_COUNTRIES: SearchCountry[] = [
  { name: 'Anywhere', subdomain: '', localTitles: {} },
  { name: 'India', subdomain: 'in', localTitles: {} },
  { name: 'United States', subdomain: 'www', localTitles: {} },
  { name: 'United Kingdom', subdomain: 'uk', localTitles: {} },
  {
    name: 'Germany',
    subdomain: 'de',
    localTitles: {
      founders: ['Gründer', 'Geschäftsführer'],
      engineers: ['Softwareentwickler'],
      recruiters: ['Personalreferent'],
    },
  },
  { name: 'Netherlands', subdomain: 'nl', localTitles: { founders: ['oprichter'], engineers: ['ontwikkelaar'] } },
  {
    name: 'France',
    subdomain: 'fr',
    localTitles: {
      founders: ['fondateur', 'cofondateur'],
      engineers: ['développeur'],
      recruiters: ['chargé de recrutement'],
    },
  },
  {
    name: 'Spain',
    subdomain: 'es',
    localTitles: { founders: ['fundador', 'cofundador'], engineers: ['desarrollador'] },
  },
  {
    name: 'Brazil',
    subdomain: 'br',
    localTitles: { founders: ['fundador', 'sócio fundador'], engineers: ['desenvolvedor'] },
  },
  {
    name: 'Japan',
    subdomain: 'jp',
    localTitles: { founders: ['創業者', '代表取締役'], engineers: ['エンジニア'], recruiters: ['採用担当'] },
  },
  { name: 'Singapore', subdomain: 'sg', localTitles: {} },
  { name: 'United Arab Emirates', subdomain: 'ae', localTitles: {} },
  { name: 'Canada', subdomain: 'ca', localTitles: {} },
  { name: 'Australia', subdomain: 'au', localTitles: {} },
  { name: 'Ireland', subdomain: 'ie', localTitles: {} },
  { name: 'Poland', subdomain: 'pl', localTitles: { founders: ['założyciel'], engineers: ['programista'] } },
];

export const PEOPLE_TARGETS: Record<PeopleTarget, { label: string; titles: string[] }> = {
  founders: { label: 'Startup founders and CEOs', titles: ['founder', 'co-founder', 'CEO'] },
  engineeringLeaders: {
    label: 'CTOs and engineering leaders',
    titles: ['CTO', 'VP Engineering', 'Head of Engineering'],
  },
  hiringManagers: { label: 'Engineering managers', titles: ['Engineering Manager', 'Hiring Manager', 'Tech Lead'] },
  recruiters: { label: 'Recruiters', titles: ['Technical Recruiter', 'Talent Acquisition', 'Talent Partner'] },
  engineers: { label: 'Engineers (for referrals)', titles: ['Software Engineer', 'Backend Engineer', 'SDE'] },
};

export interface PeopleSearchRequest {
  target: PeopleTarget;
  country: SearchCountry;
  /** Your field, stack or industry, e.g. "AI, fintech". Comma separated. */
  keywords: string;
  /** Optional company, e.g. "Stripe". Empty searches every company. */
  company: string;
  city: string;
}

const quote = (term: string) => `"${term.replace(/"/g, '').trim()}"`;
const anyOf = (terms: string[]) => {
  const quoted = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].map(quote);
  return quoted.length > 1 ? `(${quoted.join(' OR ')})` : (quoted[0] ?? '');
};
const splitList = (text: string) =>
  text
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);

function titlesFor(request: PeopleSearchRequest): string[] {
  return [...PEOPLE_TARGETS[request.target].titles, ...(request.country.localTitles[request.target] ?? [])];
}

/** Google search of public LinkedIn profiles in that country. */
export function buildGoogleXraySearch(request: PeopleSearchRequest): string {
  const site = `site:${request.country.subdomain ? `${request.country.subdomain}.` : ''}linkedin.com/in`;
  const parts = [
    site,
    anyOf(titlesFor(request)),
    anyOf(splitList(request.keywords)),
    request.company.trim() ? quote(request.company) : '',
    request.city.trim() ? quote(request.city) : '',
    // Countries without their own LinkedIn subdomain (the US) are named instead.
    !request.city.trim() && request.country.subdomain === 'www' && request.country.name !== 'Anywhere'
      ? quote(request.country.name)
      : '',
    // Public profile pages of people, not job ads or posts.
    '-intitle:jobs -inurl:posts',
  ];
  return parts.filter(Boolean).join(' ');
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** LinkedIn's own people search (shows 2nd-degree contacts and mutual connections). */
export function buildLinkedInSearchUrl(request: PeopleSearchRequest): string {
  const keywords = [
    PEOPLE_TARGETS[request.target].titles[0],
    ...splitList(request.keywords).slice(0, 2),
    request.company,
    request.city || (request.country.name === 'Anywhere' ? '' : request.country.name),
  ]
    .map((term) => term.trim())
    .filter(Boolean)
    .join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}
