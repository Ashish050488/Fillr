import { fetchAtsJson, readText, titleCaseSlug } from '../ats-json';
import type { AtsReader, JsonObject } from '../ats-types';
import { htmlToText } from '../html-to-text';

/** {tenant}.wdN.myworkdayjobs.com/[locale/]{site}/job/{location}/{slug}_{requisition}, via the cxs API. */
export const readWorkday: AtsReader = (url) => {
  const tenant = url.hostname.match(/^([^.]+)\.(wd\d+)\.myworkdayjobs\.com$/)?.[1];
  if (!tenant) return undefined;
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const jobSegmentIndex = pathSegments.indexOf('job');
  if (jobSegmentIndex < 1) return undefined;
  const site = pathSegments[jobSegmentIndex - 1];
  // Drop /apply, /apply/applyManually and similar from the apply flow.
  const jobPath = pathSegments
    .slice(jobSegmentIndex)
    .filter((segment) => !/^apply/i.test(segment))
    .join('/');
  return fetchAtsJson(`https://${url.hostname}/wday/cxs/${tenant}/${site}/${jobPath}`).then((responseBody) => {
    const postingDetail = responseBody as JsonObject | undefined;
    const postingInfo = (postingDetail?.jobPostingInfo ?? {}) as JsonObject;
    if (!readText(postingInfo.title)) return undefined;
    const hiringOrganization = postingDetail?.hiringOrganization as JsonObject | undefined;
    return {
      ats: 'Workday',
      title: readText(postingInfo.title),
      company: readText(hiringOrganization?.name) || titleCaseSlug(tenant),
      location: readText(postingInfo.location),
      employmentType: readText(postingInfo.timeType),
      description: htmlToText(readText(postingInfo.jobDescription)),
    };
  });
};
