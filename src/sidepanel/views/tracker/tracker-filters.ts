import type { Job, JobStatus } from '../../../shared/types';

/** The tracker lists only applications you actually submitted. */
export const SUBMITTED_STATUSES: JobStatus[] = ['applied', 'interview', 'offer', 'rejected'];
/** "filled" is offered as "Not submitted", which takes a false positive off the list. */
export const SELECTABLE_STATUSES: JobStatus[] = [...SUBMITTED_STATUSES, 'filled'];
export const TRACKER_FILTERS = ['All', 'Follow up', 'Waiting', 'Interviews', 'Offers', 'Rejected'] as const;
export type TrackerFilter = (typeof TRACKER_FILTERS)[number];

const MILLISECONDS_PER_WEEK = 7 * 86_400_000;
const DAY_MILLISECONDS = 86_400_000;
// One polite follow-up around day 8 to 10; after about 45 days of silence it is a silent no.
const FOLLOW_UP_AFTER_DAYS = 8;
const SILENT_AFTER_DAYS = 45;

export type FollowUpStage = 'due' | 'silent';

/** Whether an application still waiting for a reply needs a nudge, or has gone quiet for good. */
export function applicationFollowUp(job: Job, now = Date.now()): FollowUpStage | undefined {
  if (job.status !== 'applied') return undefined;
  const daysWaiting = (now - (job.appliedAt ?? job.timestamp)) / DAY_MILLISECONDS;
  if (daysWaiting >= SILENT_AFTER_DAYS) return 'silent';
  return daysWaiting >= FOLLOW_UP_AFTER_DAYS ? 'due' : undefined;
}

export function daysSinceApplied(job: Job, now = Date.now()): number {
  return Math.floor((now - (job.appliedAt ?? job.timestamp)) / DAY_MILLISECONDS);
}

export function matchesFilter(job: Job, filter: TrackerFilter): boolean {
  if (filter === 'Follow up') return applicationFollowUp(job) === 'due';
  if (filter === 'Waiting') return job.status === 'applied';
  if (filter === 'Interviews') return job.status === 'interview';
  if (filter === 'Offers') return job.status === 'offer';
  if (filter === 'Rejected') return job.status === 'rejected';
  return true;
}

export function isAppliedThisWeek(job: Job): boolean {
  return (job.appliedAt ?? job.timestamp) > Date.now() - MILLISECONDS_PER_WEEK;
}

export function formatShortDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function formatStatus(status: JobStatus): string {
  return status === 'filled' ? 'Not submitted' : status[0].toUpperCase() + status.slice(1);
}
