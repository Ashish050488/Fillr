import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** {subdomain}.recruitee.com/o/{slug}. */
export const readRecruitee: AtsReader = (url) => {
  const subdomain = url.hostname.match(/^([^.]+)\.recruitee\.com$/)?.[1];
  const offerSlug = url.pathname.match(/\/o\/([^/]+)/)?.[1];
  if (!subdomain || !offerSlug) return undefined;
  return fetchAtsJson(`https://${subdomain}.recruitee.com/api/offers/${offerSlug}`).then((responseBody) => {
    const posting = (responseBody as JsonObject | undefined)?.offer as JsonObject | undefined;
    if (!posting || !readText(posting.title)) return undefined;
    return {
      ats: 'Recruitee',
      title: readText(posting.title),
      company: readText(posting.company_name) || titleCaseSlug(subdomain),
      location: readText(posting.location),
      description: [htmlToText(readText(posting.description)), htmlToText(readText(posting.requirements))]
        .filter(Boolean)
        .join('\n\n'),
    };
  });
};
