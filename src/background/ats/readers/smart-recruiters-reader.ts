import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

const SECTION_ORDER = ['jobDescription', 'qualifications', 'additionalInformation', 'companyDescription'];

/** jobs.smartrecruiters.com/{company}/{postingId}-{slug}. */
export const readSmartRecruiters: AtsReader = (url) => {
  if (!/smartrecruiters\.com$/.test(url.hostname)) return undefined;
  const [companySlug, postingSlug] = url.pathname.split('/').filter(Boolean);
  const postingId = postingSlug?.match(/^(\d+)/)?.[1];
  if (!companySlug || !postingId) return undefined;
  const postingUrl = `https://api.smartrecruiters.com/v1/companies/${companySlug}/postings/${postingId}`;
  return fetchAtsJson(postingUrl).then((responseBody) => {
    const posting = responseBody as JsonObject | undefined;
    if (!posting || !readText(posting.name)) return undefined;
    const sections = (((posting.jobAd ?? {}) as JsonObject).sections ?? {}) as Record<string, JsonObject>;
    const description = SECTION_ORDER.map((sectionName) => sections[sectionName])
      .filter(Boolean)
      .map((section) => `${readText(section.title)}\n${htmlToText(readText(section.text))}`)
      .join('\n\n');
    const location = (posting.location ?? {}) as JsonObject;
    return {
      ats: 'SmartRecruiters',
      title: readText(posting.name),
      company: readText((posting.company as JsonObject | undefined)?.name) || titleCaseSlug(companySlug),
      location: [readText(location.city), readText(location.country).toUpperCase()].filter(Boolean).join(', '),
      description,
    };
  });
};
