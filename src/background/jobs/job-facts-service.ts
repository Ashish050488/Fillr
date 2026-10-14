import type { Job, JobFacts, PageScan } from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { fetchAtsJob, type AtsJob } from '../ats/fetch-ats-job';
import { getJobByKey, jobKey, updateJob } from './job-store';

// Gemma's free tier allows ~15k tokens a minute; ~36k characters stays safely inside it.
const MAXIMUM_PAGE_TEXT_FOR_GEMMA = 36000;

function toJobFacts(atsJob: AtsJob): JobFacts {
  return {
    title: atsJob.title,
    company: atsJob.company,
    location: atsJob.location,
    employmentType: atsJob.employmentType,
    description: atsJob.description,
    ats: atsJob.ats,
  };
}

/**
 * A clean posting for this job, worked out once and reused for every later AI call:
 * known ATS → its public API (no AI at all); otherwise Gemma cleans the page text.
 */
export async function loadJobFacts(
  job: Job | undefined,
  scan: Pick<PageScan, 'pageText' | 'url' | 'jobTitle' | 'atsUrl'>,
): Promise<JobFacts | undefined> {
  if (job?.jobFacts) return job.jobFacts;
  const atsJob = await fetchAtsJob(scan.url, scan.atsUrl);
  if (atsJob) return toJobFacts(atsJob);
  if (!scan.pageText.trim()) return undefined;
  try {
    const pageText = scan.pageText.slice(0, MAXIMUM_PAGE_TEXT_FOR_GEMMA);
    return (await runTask('job_parsing', { pageText, url: scan.url, pageTitle: scan.jobTitle })).result as JobFacts;
  } catch {
    return undefined; // Fall back to raw page text; answers still work, with more noise.
  }
}

/** "Senior Engineer - Globex | Lever" or "Apply: Senior Engineer" becomes "Senior Engineer". */
export function cleanTitle(pageTitle?: string): string | undefined {
  const title = pageTitle
    ?.split(/\s[|–—-]\s/)[0]
    ?.replace(/^(apply( for| to)?|job application( for)?)[:\s-]*/i, '')
    .trim();
  return title && title.length > 2 && title.length < 140 ? title : undefined;
}

/** Title and company for the tracker, without any AI: ATS API first, then what the page said. */
export async function ensureJobMeta(
  url: string,
  pageHint: { jobTitle?: string; company?: string; atsUrl?: string } = {},
): Promise<Job> {
  const existingJob = await getJobByKey(jobKey(url));
  if (existingJob?.jobTitle && existingJob.company) return existingJob;
  const atsJob = await fetchAtsJob(url, pageHint.atsUrl);
  return updateJob(url, (current) => ({
    ...current,
    jobTitle: current.jobTitle || atsJob?.title || cleanTitle(pageHint.jobTitle),
    company: current.company || atsJob?.company || pageHint.company,
    ...(atsJob && !current.jobFacts ? { jobFacts: toJobFacts(atsJob) } : {}),
  }));
}
