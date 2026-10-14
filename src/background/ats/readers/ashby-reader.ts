import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** jobs.ashbyhq.com/{organization}/{id}: the board API lists every posting, so find this one. */
export const readAshby: AtsReader = (url) => {
  if (url.hostname !== 'jobs.ashbyhq.com') return undefined;
  const [organization, postingId] = url.pathname.split('/').filter(Boolean);
  if (!organization || !postingId) return undefined;
  const boardUrl = `https://api.ashbyhq.com/posting-api/job-board/${organization}?includeCompensation=true`;
  return fetchAtsJson(boardUrl).then((responseBody) => {
    const board = responseBody as JsonObject | undefined;
    const postings = Array.isArray(board?.jobs) ? (board.jobs as JsonObject[]) : [];
    const posting = postings.find(
      (candidate) => readText(candidate.id) === postingId || readText(candidate.jobUrl).includes(postingId),
    );
    if (!posting) return undefined;
    return {
      ats: 'Ashby',
      title: readText(posting.title),
      company: titleCaseSlug(organization),
      location: readText(posting.location),
      employmentType: readText(posting.employmentType),
      description: readText(posting.descriptionPlain) || htmlToText(readText(posting.descriptionHtml)),
    };
  });
};
