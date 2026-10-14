const COMMON_ALIASES: Record<string, string> = {
  usa: 'United States',
  'u.s.': 'United States',
  'united states of america': 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  uae: 'United Arab Emirates',
  bengaluru: 'India',
  bangalore: 'India',
  mumbai: 'India',
  hyderabad: 'India',
  pune: 'India',
  chennai: 'India',
  gurugram: 'India',
  gurgaon: 'India',
  noida: 'India',
  'new delhi': 'India',
  'san francisco': 'United States',
  'new york': 'United States',
  seattle: 'United States',
  london: 'United Kingdom',
  toronto: 'Canada',
  singapore: 'Singapore',
};

let countryNames: string[] | undefined;

function listCountryNames(): string[] {
  if (countryNames) return countryNames;
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const names = new Set<string>();
  for (const firstLetter of letters) {
    for (const secondLetter of letters) {
      const regionName = regionNames.of(`${firstLetter}${secondLetter}`);
      if (regionName && regionName !== `${firstLetter}${secondLetter}` && !/unknown/i.test(regionName))
        names.add(regionName);
    }
  }
  // Longest first, so "Papua New Guinea" wins over "Guinea".
  countryNames = [...names].sort((first, second) => second.length - first.length);
  return countryNames;
}

const escapeForPattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The country a job location like "Bengaluru, Karnataka, India" or "Remote - USA" points to. */
export function findCountry(locationText: string | undefined): string | undefined {
  if (!locationText?.trim()) return undefined;
  for (const countryName of listCountryNames()) {
    if (new RegExp(`\\b${escapeForPattern(countryName)}\\b`, 'i').test(locationText)) return countryName;
  }
  const lowerLocation = locationText.toLowerCase();
  for (const [alias, countryName] of Object.entries(COMMON_ALIASES)) {
    if (new RegExp(`(^|[^a-z])${escapeForPattern(alias)}([^a-z]|$)`).test(lowerLocation)) return countryName;
  }
  return undefined;
}
