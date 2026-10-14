import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** boards.greenhouse.io/{board}/jobs/{id}, job-boards(.eu).greenhouse.io, or an embed with ?for=&token=. */
export const readGreenhouse: AtsReader = (url) => {
  if (!/greenhouse\.io$/.test(url.hostname)) return undefined;
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const isJobPath = pathSegments[1] === 'jobs';
  const board = url.searchParams.get('for') ?? (isJobPath ? pathSegments[0] : undefined);
  const postingId =
    url.searchParams.get('token') ?? url.searchParams.get('gh_jid') ?? (isJobPath ? pathSegments[2] : undefined);
  if (!board || !postingId || !/^\d+$/.test(postingId)) return undefined;
  const apiHost = url.hostname.includes('.eu.') ? 'boards-api.eu.greenhouse.io' : 'boards-api.greenhouse.io';
  return fetchAtsJson(`https://${apiHost}/v1/boards/${board}/jobs/${postingId}`).then((responseBody) => {
    const posting = responseBody as JsonObject | undefined;
    if (!posting || !readText(posting.title)) return undefined;
    return {
      ats: 'Greenhouse',
      title: readText(posting.title),
      company: readText(posting.company_name) || titleCaseSlug(board),
      location: readText((posting.location as JsonObject | undefined)?.name),
      description: htmlToText(readText(posting.content)),
    };
  });
};
