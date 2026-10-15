import { buildYcJobBrief } from '../../../shared/jobs/yc-job-brief';
import { fetchAtsHtml } from '../ats-json';
import type { AtsReader } from '../ats-types';
import { decodeEntities } from '../html-to-text';

const YC_JOB_PATH = /^\/companies\/[^/]+\/jobs\/[^/]+/;

/** The page's Inertia data (data-page="{…}"), which holds the company, founders and job. */
export function readYcPageProps(html: string): unknown {
  const encodedPageData = html.match(/data-page="([^"]+)"/)?.[1];
  if (!encodedPageData) return undefined;
  try {
    return (JSON.parse(decodeEntities(encodedPageData)) as { props?: unknown }).props;
  } catch {
    return undefined;
  }
}

/** www.ycombinator.com/companies/{slug}/jobs/{id}: company story, founder bios and the job, in one page. */
export const readYc: AtsReader = (url) => {
  if (!/(^|\.)ycombinator\.com$/.test(url.hostname) || !YC_JOB_PATH.test(url.pathname)) return undefined;
  const jobPageUrl = `https://www.ycombinator.com${url.pathname.match(YC_JOB_PATH)?.[0]}`;
  return fetchAtsHtml(jobPageUrl).then((html) => {
    const jobBrief = html ? buildYcJobBrief(readYcPageProps(html)) : undefined;
    if (!jobBrief) return undefined;
    return { ats: 'Y Combinator', title: jobBrief.title, company: jobBrief.company, description: jobBrief.brief };
  });
};
