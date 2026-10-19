import React from 'react';
import type { PostingSignal } from '../../../shared/jobs/posting-signals';
import type { Job } from '../../../shared/types';
import { companyKey } from '../../../shared/jobs/company-key';
import { jobKey } from '../../../shared/jobs/job-key';
import { formatShortDate, SUBMITTED_STATUSES } from '../tracker/tracker-filters';

const RECENT_APPLICATION_DAYS = 60;
const DAY_MILLISECONDS = 86_400_000;
const TONE_MARKS = { good: '✓', info: '·', warning: '!' } as const;

/** Applications to the same company in the last two months, other than this job. */
export function findRecentApplicationsAtCompany(job: Job, jobs: Job[], now = Date.now()): Job[] {
  const company = companyKey(job.company);
  if (!company) return [];
  const thisKey = job.key ?? jobKey(job.url);
  return jobs.filter(
    (other) =>
      (other.key ?? jobKey(other.url)) !== thisKey &&
      companyKey(other.company) === company &&
      SUBMITTED_STATUSES.includes(other.status) &&
      now - (other.appliedAt ?? other.timestamp) < RECENT_APPLICATION_DAYS * DAY_MILLISECONDS,
  );
}

/**
 * One line of facts about the posting (age, reposted, applicants, pay) and a warning when you
 * already applied to this company recently, so you don't apply twice or chase a ghost job.
 */
export default function PostingFacts({
  job,
  jobs,
  liveSignals,
}: {
  job?: Job;
  jobs: Job[];
  /** Read from the open page just now; preferred over what was saved at the last fit check. */
  liveSignals?: PostingSignal[];
}) {
  const readSignals = liveSignals ?? job?.postingSignals ?? [];
  // On a page that is not a posting yet (no age or applicants), "No pay range" alone is noise.
  const looksLikePosting = Boolean(job) || readSignals.some((signal) => !/\bpay\b/i.test(signal.label));
  const signals = looksLikePosting ? readSignals : [];
  const earlierApplications = job ? findRecentApplicationsAtCompany(job, jobs) : [];
  if (!signals.length && !earlierApplications.length) return null;
  return (
    <div className="stack-sm">
      {signals.length > 0 && (
        <div className="chips" aria-label="About this posting">
          {signals.map((signal) => (
            <span key={signal.label} className={`chip signal ${signal.tone}`}>
              <span aria-hidden="true">{TONE_MARKS[signal.tone]}</span> {signal.label}
            </span>
          ))}
        </div>
      )}
      {earlierApplications.length > 0 && (
        <p className="notice small">
          You applied to {job?.company} on{' '}
          {formatShortDate(earlierApplications[0].appliedAt ?? earlierApplications[0].timestamp)}
          {earlierApplications[0].jobTitle ? ` (${earlierApplications[0].jobTitle})` : ''}
          {earlierApplications.length > 1 ? ` and ${earlierApplications.length - 1} more` : ''}. A referral may help
          more than another application.
        </p>
      )}
    </div>
  );
}
