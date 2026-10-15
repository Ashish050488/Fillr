import React from 'react';
import type { Job } from '../../../shared/types';
import { formatShortDate, formatStatus, hostnameOf } from './tracker-filters';

/** One application on one line: title, company and date; fit score and status on the right. */
export default function ApplicationRow({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const meta = [job.company || job.site || hostnameOf(job.url), formatShortDate(job.appliedAt ?? job.timestamp)]
    .filter(Boolean)
    .join(' · ');
  return (
    <button type="button" className="row-compact" onClick={onOpen} aria-haspopup="dialog">
      <span>
        <span className="row-title">{job.jobTitle || hostnameOf(job.url) || 'Job'}</span>
        <span className="row-meta">{meta}</span>
      </span>
      <span className="row-side">
        {job.analysis && <span title="Fit score">{job.analysis.score}%</span>}
        {job.status !== 'applied' && <b className="badge solid">{formatStatus(job.status)}</b>}
      </span>
    </button>
  );
}
