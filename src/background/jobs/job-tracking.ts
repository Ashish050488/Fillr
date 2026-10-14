import { z } from 'zod';
import { setStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import type { Job } from '../../shared/types';
import { readJobs, SUBMITTED_STATUSES, updateJob, withJobStoreLock } from './job-store';

const UNSUBMITTED_RETENTION_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;
const FIELDS_FILLED_PER_MINUTE_SAVED = 4; // Roughly 15 seconds of typing saved per field.

const fillRecordSchema = z.object({
  url: z.string().url(),
  site: z.string(),
  fieldsFilled: z.number().int().positive(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
});

/** A form was filled: mark the job "filled" and add to the lifetime counters. */
export async function recordFill(payload: unknown): Promise<{ success: true; jobId: string }> {
  const fillRecord = fillRecordSchema.parse(payload);
  const job = await updateJob(
    fillRecord.url,
    (current) => ({
      ...current,
      jobTitle: current.jobTitle || fillRecord.jobTitle,
      company: current.company || fillRecord.company,
      fieldsFilled: current.fieldsFilled + fillRecord.fieldsFilled,
      status: current.status === 'saved' ? 'filled' : current.status,
      filledAt: Date.now(),
      timestamp: Date.now(),
    }),
    (metrics) => ({
      ...metrics,
      totalFormsFilled: metrics.totalFormsFilled + 1,
      totalFieldsFilled: metrics.totalFieldsFilled + fillRecord.fieldsFilled,
      timeSavedMinutes: metrics.timeSavedMinutes + Math.ceil(fillRecord.fieldsFilled / FIELDS_FILLED_PER_MINUTE_SAVED),
    }),
  );
  return { success: true, jobId: job.id };
}

/** A status chosen by hand: stamps dates and keeps the applied count in step. */
export function setStatus(url: string, status: Job['status']): Promise<Job> {
  let appliedCountChange = 0;
  return updateJob(
    url,
    (current) => {
      const wasSubmitted = SUBMITTED_STATUSES.includes(current.status);
      const isSubmitted = SUBMITTED_STATUSES.includes(status);
      appliedCountChange = isSubmitted === wasSubmitted ? 0 : isSubmitted ? 1 : -1;
      return {
        ...current,
        status,
        appliedAuto: isSubmitted ? current.appliedAuto && wasSubmitted : false,
        appliedAt: isSubmitted ? (current.appliedAt ?? Date.now()) : undefined,
        filledAt: status === 'filled' ? (current.filledAt ?? Date.now()) : current.filledAt,
      };
    },
    (metrics) => ({ ...metrics, totalJobsApplied: Math.max(0, metrics.totalJobsApplied + appliedCountChange) }),
  );
}

/** The site confirmed a submission (or you said so): the job counts as applied, once. */
export async function markApplied(
  url: string,
  isDetectedAutomatically = false,
): Promise<{ success: boolean; jobTitle?: string; error?: string }> {
  if (!url) return { success: false, error: 'No page to mark.' };
  let isNewSubmission = false;
  const job = await updateJob(
    url,
    (current) => {
      isNewSubmission = current.status === 'filled' || current.status === 'saved';
      if (!isNewSubmission) return current;
      return {
        ...current,
        status: 'applied',
        appliedAt: Date.now(),
        appliedAuto: isDetectedAutomatically,
        timestamp: Date.now(),
      };
    },
    (metrics) => (isNewSubmission ? { ...metrics, totalJobsApplied: metrics.totalJobsApplied + 1 } : metrics),
  );
  return { success: true, jobTitle: job.jobTitle };
}

/**
 * Housekeeping, then submitted jobs still missing a title or company (to look up again).
 * Saves merged duplicates and drops jobs you only looked at more than a month ago.
 */
export async function jobsMissingTitles(): Promise<Job[]> {
  const oldestKeptTimestamp = Date.now() - UNSUBMITTED_RETENTION_DAYS * MILLISECONDS_PER_DAY;
  await withJobStoreLock(async () => {
    const keptJobs = (await readJobs()).filter(
      (job) => SUBMITTED_STATUSES.includes(job.status) || job.timestamp > oldestKeptTimestamp,
    );
    await setStorage({ [STORAGE_KEYS.JOBS]: keptJobs });
  });
  return (await readJobs())
    .filter((job) => SUBMITTED_STATUSES.includes(job.status) && (!job.jobTitle || !job.company))
    .slice(0, 20);
}
