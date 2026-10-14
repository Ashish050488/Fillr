import React from 'react';
import type { Job, JobStatus } from '../../../shared/types';
import Icon from '../../components/Icon';
import ScoreRing from '../../components/ScoreRing';
import { copyText } from '../../services/text-export';
import { formatShortDate, formatStatus, hostnameOf, SELECTABLE_STATUSES } from './tracker-filters';
import Dropdown from '../../components/Dropdown';

interface ApplicationRowProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: { status?: JobStatus; coverLetter?: string }) => Promise<unknown>;
  onDelete: () => void;
  onToast: (message: string) => void;
}

/** One submitted application: title, company, applied date; expands to status, letter and links. */
export default function ApplicationRow({
  job,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onToast,
}: ApplicationRowProps) {
  return (
    <div className="item job">
      {job.analysis ? (
        <ScoreRing score={job.analysis.score} size="mini" />
      ) : (
        <span className="mini-ring" aria-hidden="true" />
      )}
      <button type="button" className="job-main" onClick={onToggle} aria-expanded={isExpanded}>
        <h4>{job.jobTitle || hostnameOf(job.url) || 'Job'}</h4>
        <p className="meta">{[job.company, job.jobFacts?.location].filter(Boolean).join(' · ') || job.site}</p>
        <p className="meta">
          Applied {formatShortDate(job.appliedAt ?? job.timestamp)}
          {job.appliedAuto ? ' · detected automatically' : ''}
          {job.status !== 'applied' && (
            <>
              {' '}
              · <b className="badge solid">{job.status}</b>
            </>
          )}
        </p>
      </button>
      <button
        type="button"
        className="btn icon quiet"
        title="Delete from tracker"
        aria-label={`Delete ${job.jobTitle || 'this job'}`}
        onClick={onDelete}
      >
        <Icon name="trash" />
      </button>
      {isExpanded && (
        <div className="stack-sm fade-in" style={{ gridColumn: '1 / -1', paddingTop: 6 }}>
          {job.analysis && <p className="soft">{job.analysis.headline}</p>}
          <div className="status-field">
            <span className="status-label">Status</span>
            <Dropdown
              isCompact
              ariaLabel="Status"
              value={job.status}
              options={SELECTABLE_STATUSES.map((status) => ({ value: status, label: formatStatus(status) }))}
              onChange={(status) => void onUpdate({ status: status as JobStatus })}
            />
          </div>
          <p className="muted small">Choosing "Not submitted" removes it from this list.</p>
          {job.coverLetter ? (
            <textarea
              className="letter"
              style={{ minHeight: 200 }}
              defaultValue={job.coverLetter}
              aria-label="Cover letter"
              onBlur={(event) => {
                if (event.target.value === job.coverLetter) return;
                void onUpdate({ coverLetter: event.target.value }).then(() => onToast('Letter saved'));
              }}
            />
          ) : (
            <p className="soft small">No cover letter for this one.</p>
          )}
          <div className="row between">
            <div className="row">
              {job.coverLetter && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => void copyText(job.coverLetter!).then(() => onToast('Copied'))}
                >
                  <Icon name="copy" /> Copy letter
                </button>
              )}
              <a className="btn" href={job.url} target="_blank" rel="noreferrer">
                <Icon name="external" /> Open posting
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
