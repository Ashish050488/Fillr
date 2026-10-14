import { z } from 'zod';
import { jobSchema, metricsSchema } from '../../shared/schemas';
import { getStorage, setStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import type { Job, LifetimeMetrics } from '../../shared/types';
import { jobKey } from '../../shared/jobs/job-key';

export { jobKey, labelKey } from '../../shared/jobs/job-key';

/** Statuses that mean you actually submitted the application. */
export const SUBMITTED_STATUSES: Array<Job['status']> = ['applied', 'interview', 'offer', 'rejected'];
export const EMPTY_METRICS: LifetimeMetrics = {
  totalFormsFilled: 0,
  totalJobsApplied: 0,
  totalFieldsFilled: 0,
  timeSavedMinutes: 0,
};
const STATUS_PROGRESS: Record<Job['status'], number> = {
  saved: 0,
  filled: 1,
  applied: 2,
  rejected: 3,
  interview: 4,
  offer: 5,
};

let pendingWrites: Promise<unknown> = Promise.resolve();

/** All job writes go through one queue so a fill and an analysis never overwrite each other. */
export function withJobStoreLock<Outcome>(operation: () => Promise<Outcome>): Promise<Outcome> {
  const queuedOperation = pendingWrites.then(operation, operation);
  pendingWrites = queuedOperation.catch(() => undefined);
  return queuedOperation;
}

/** Two records for one job (older key rules, Workday's many URLs) become one. */
function mergeJobRecords(first: Job, second: Job): Job {
  const [newer, older] = second.timestamp > first.timestamp ? [second, first] : [first, second];
  return {
    ...older,
    ...newer,
    status: STATUS_PROGRESS[first.status] >= STATUS_PROGRESS[second.status] ? first.status : second.status,
    jobTitle: newer.jobTitle || older.jobTitle,
    company: newer.company || older.company,
    date: older.date,
    fieldsFilled: Math.max(first.fieldsFilled, second.fieldsFilled),
    filledAt: newer.filledAt ?? older.filledAt,
    appliedAt: older.appliedAt ?? newer.appliedAt,
    analysis: newer.analysis ?? older.analysis,
    jobFacts: newer.jobFacts ?? older.jobFacts,
    coverLetter: newer.coverLetter || older.coverLetter,
    answers: { ...older.answers, ...newer.answers },
    asked: [...new Set([...(older.asked ?? []), ...(newer.asked ?? [])])],
  };
}

/** Every saved job, one record per posting. Keys are recomputed so older records still match. */
export async function readJobs(): Promise<Job[]> {
  const parsedJobs = z.array(jobSchema).safeParse(await getStorage<unknown>(STORAGE_KEYS.JOBS, []));
  const jobsByKey = new Map<string, Job>();
  for (const job of parsedJobs.success ? (parsedJobs.data as Job[]) : []) {
    const key = jobKey(job.url);
    const sameJob = jobsByKey.get(key);
    jobsByKey.set(key, sameJob ? mergeJobRecords(sameJob, job) : { ...job, key });
  }
  return [...jobsByKey.values()];
}

export async function readMetrics(): Promise<LifetimeMetrics> {
  const parsedMetrics = metricsSchema.safeParse(await getStorage<unknown>(STORAGE_KEYS.METRICS, EMPTY_METRICS));
  return parsedMetrics.success ? parsedMetrics.data : EMPTY_METRICS;
}

export async function getJob(url: string): Promise<Job | undefined> {
  return getJobByKey(jobKey(url));
}

export async function getJobByKey(key: string): Promise<Job | undefined> {
  return (await readJobs()).find((job) => jobKey(job.url) === key);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Create or update the record for a posting, optionally adjusting the lifetime counters too. */
export function updateJob(
  url: string,
  changeJob: (job: Job) => Job,
  changeMetrics?: (current: LifetimeMetrics, job: Job, isNewJob: boolean) => LifetimeMetrics,
): Promise<Job> {
  return withJobStoreLock(async () => {
    const key = jobKey(url);
    const jobs = await readJobs();
    const existingJob = jobs.find((job) => jobKey(job.url) === key);
    const startingJob: Job = existingJob ?? {
      id: crypto.randomUUID(),
      key,
      url,
      site: hostnameOf(url),
      date: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'saved',
      fieldsFilled: 0,
    };
    const updatedJob = { ...changeJob({ ...startingJob }), key };
    const storageUpdate: Record<string, unknown> = {
      [STORAGE_KEYS.JOBS]: existingJob
        ? jobs.map((job) => (job === existingJob ? updatedJob : job))
        : [updatedJob, ...jobs],
    };
    if (changeMetrics)
      storageUpdate[STORAGE_KEYS.METRICS] = changeMetrics(await readMetrics(), updatedJob, !existingJob);
    await setStorage(storageUpdate);
    return updatedJob;
  });
}

/** Delete a job; a false "applied" also comes off your applied count. */
export function deleteJob(key: string): Promise<boolean> {
  return withJobStoreLock(async () => {
    const jobs = await readJobs();
    const deletedJobs = jobs.filter((job) => jobKey(job.url) === key);
    if (!deletedJobs.length) return false;
    const storageUpdate: Record<string, unknown> = {
      [STORAGE_KEYS.JOBS]: jobs.filter((job) => jobKey(job.url) !== key),
    };
    const deletedSubmissionCount = deletedJobs.filter((job) => SUBMITTED_STATUSES.includes(job.status)).length;
    if (deletedSubmissionCount) {
      const metrics = await readMetrics();
      storageUpdate[STORAGE_KEYS.METRICS] = {
        ...metrics,
        totalJobsApplied: Math.max(0, metrics.totalJobsApplied - deletedSubmissionCount),
      };
    }
    await setStorage(storageUpdate);
    return true;
  });
}
