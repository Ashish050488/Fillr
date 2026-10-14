import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** apply.workable.com/{account}/j/{shortcode}. */
export const readWorkable: AtsReader = (url) => {
  if (url.hostname !== 'apply.workable.com') return undefined;
  const [, account, shortcode] = url.pathname.match(/^\/([^/]+)\/j\/([^/]+)/) ?? [];
  if (!account || !shortcode) return undefined;
  return fetchAtsJson(`https://apply.workable.com/api/v2/accounts/${account}/jobs/${shortcode}`).then(
    (responseBody) => {
      const posting = responseBody as JsonObject | undefined;
      if (!posting || !readText(posting.title)) return undefined;
      const location = (posting.location ?? {}) as JsonObject;
      const descriptionParts = [posting.description, posting.requirements, posting.benefits];
      return {
        ats: 'Workable',
        title: readText(posting.title),
        company: titleCaseSlug(account),
        location: [readText(location.city), readText(location.country)].filter(Boolean).join(', '),
        description: descriptionParts
          .map((part) => htmlToText(readText(part)))
          .filter(Boolean)
          .join('\n\n'),
      };
    },
  );
};
