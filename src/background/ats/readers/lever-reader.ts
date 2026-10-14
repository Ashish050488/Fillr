import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** jobs.lever.co/{company}/{uuid}, including /apply. The description comes in sections. */
export const readLever: AtsReader = (url) => {
  if (!/lever\.co$/.test(url.hostname)) return undefined;
  const [companySlug, postingId] = url.pathname.split('/').filter(Boolean);
  if (!companySlug || !postingId || !/^[0-9a-f-]{36}$/i.test(postingId)) return undefined;
  const apiHost = url.hostname.includes('.eu.') ? 'api.eu.lever.co' : 'api.lever.co';
  return fetchAtsJson(`https://${apiHost}/v0/postings/${companySlug}/${postingId}`).then((responseBody) => {
    const posting = responseBody as JsonObject | undefined;
    if (!posting || !readText(posting.text)) return undefined;
    const categories = (posting.categories ?? {}) as JsonObject;
    const sections = Array.isArray(posting.lists) ? (posting.lists as JsonObject[]) : [];
    const description = [
      readText(posting.descriptionPlain) || htmlToText(readText(posting.description)),
      ...sections.map((section) => `${readText(section.text)}:\n${htmlToText(readText(section.content))}`),
      readText(posting.additionalPlain) || htmlToText(readText(posting.additional)),
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      ats: 'Lever',
      title: readText(posting.text),
      company: titleCaseSlug(companySlug),
      location: readText(categories.location),
      employmentType: readText(categories.commitment),
      description,
    };
  });
};
