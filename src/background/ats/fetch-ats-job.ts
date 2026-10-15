/**
 * Read a posting straight from its applicant-tracking system's public API instead of the page:
 * clean title, company, location and description with no AI call. Endpoints mirror the adapters
 * in the ejg-remote-scraper project. Any failure returns undefined; the page text is the fallback.
 */
import { getStorage, setStorage } from '../../shared/storage/extension-storage';
import type { AtsJob, AtsReader } from './ats-types';
import { readAshby } from './readers/ashby-reader';
import { readGreenhouse } from './readers/greenhouse-reader';
import { readLever } from './readers/lever-reader';
import { readRecruitee } from './readers/recruitee-reader';
import { readSmartRecruiters } from './readers/smart-recruiters-reader';
import { readWorkable } from './readers/workable-reader';
import { readWorkday } from './readers/workday-reader';
import { readYc } from './readers/yc-reader';

export type { AtsJob } from './ats-types';
export { htmlToText } from './html-to-text';

const CACHE_STORAGE_KEY = 'jobfill_ats_cache_v1';
const MAXIMUM_CACHED_POSTINGS = 60;
const CACHE_LIFETIME_MILLISECONDS = 7 * 86_400_000;
const MAXIMUM_DESCRIPTION_LENGTH = 12000;

const ATS_READERS: AtsReader[] = [
  readGreenhouse,
  readLever,
  readAshby,
  readWorkday,
  readSmartRecruiters,
  readRecruitee,
  readWorkable,
  readYc,
];

const ATS_HOSTS: Array<[RegExp, string]> = [
  [/greenhouse\.io$/, 'Greenhouse'],
  [/lever\.co$/, 'Lever'],
  [/^jobs\.ashbyhq\.com$/, 'Ashby'],
  [/myworkdayjobs\.com$/, 'Workday'],
  [/smartrecruiters\.com$/, 'SmartRecruiters'],
  [/recruitee\.com$/, 'Recruitee'],
  [/^apply\.workable\.com$/, 'Workable'],
  [/(^|\.)(ycombinator|workatastartup)\.com$/, 'Y Combinator'],
];

/** Which ATS a URL belongs to, without fetching anything. */
export function atsName(pageUrl: string): string | undefined {
  try {
    const hostname = new URL(pageUrl).hostname;
    return ATS_HOSTS.find(([hostPattern]) => hostPattern.test(hostname))?.[1];
  } catch {
    return undefined;
  }
}

function cacheKeyFor(url: URL): string {
  const postingId = url.searchParams.get('gh_jid') ?? url.searchParams.get('token') ?? '';
  return `${url.hostname}${url.pathname}?${postingId}`.replace(/\/(apply|application)\/?(?=\?)/, '');
}

type AtsCache = Record<string, { at: number; job: AtsJob }>;

/**
 * The posting behind any of these URLs (page, apply page, or an embedded ATS iframe).
 * Cached for a week so the side panel, widget and tracker never fetch twice.
 */
export async function fetchAtsJob(...pageUrls: Array<string | undefined>): Promise<AtsJob | undefined> {
  for (const pageUrl of pageUrls) {
    if (!pageUrl) continue;
    let url: URL;
    try {
      url = new URL(pageUrl);
    } catch {
      continue;
    }
    const cacheKey = cacheKeyFor(url);
    const cache = await getStorage<AtsCache>(CACHE_STORAGE_KEY, {});
    const cachedEntry = cache[cacheKey];
    if (cachedEntry && Date.now() - cachedEntry.at < CACHE_LIFETIME_MILLISECONDS) return cachedEntry.job;
    for (const readAts of ATS_READERS) {
      const readerRequest = readAts(url);
      if (!readerRequest) continue;
      const atsJob = await readerRequest;
      if (!atsJob?.title) break;
      atsJob.description = atsJob.description.slice(0, MAXIMUM_DESCRIPTION_LENGTH);
      const recentEntries = Object.entries(cache)
        .sort((first, second) => second[1].at - first[1].at)
        .slice(0, MAXIMUM_CACHED_POSTINGS - 1);
      await setStorage({
        [CACHE_STORAGE_KEY]: Object.fromEntries([[cacheKey, { at: Date.now(), job: atsJob }], ...recentEntries]),
      });
      return atsJob;
    }
  }
  return undefined;
}
