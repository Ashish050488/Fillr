import React from 'react';
import type { Job, JobStatus } from '../../../shared/types';
import Dropdown from '../../components/Dropdown';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import { copyText } from '../../services/text-export';
import { FollowUpPanel, InterviewPrepPanel } from './ApplicationExtras';
import { formatShortDate, formatStatus, hostnameOf, SELECTABLE_STATUSES } from './tracker-filters';

interface ApplicationSheetProps {
  job: Job;
  onClose: () => void;
  onUpdate: (patch: { status?: JobStatus; coverLetter?: string }) => Promise<unknown>;
  onDelete: () => void;
  onToast: (message: string) => void;
}

/** Everything about one application: status, fit, cover letter and links. */
export default function ApplicationSheet({ job, onClose, onUpdate, onDelete, onToast }: ApplicationSheetProps) {
  const appliedDate = formatShortDate(job.appliedAt ?? job.timestamp);
  return (
    <Sheet
      title={job.jobTitle || hostnameOf(job.url) || 'Job'}
      subtitle={[job.company, job.jobFacts?.location].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <dl className="detail-grid">
        <dt>Applied</dt>
        <dd>
          {appliedDate}
          {job.appliedAuto ? ', detected automatically' : ''}
        </dd>
        {job.analysis && (
          <>
            <dt>Fit</dt>
            <dd>
              {job.analysis.score}% · {job.analysis.headline}
            </dd>
          </>
        )}
        <dt>Site</dt>
        <dd>{hostnameOf(job.url)}</dd>
      </dl>
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
      <FollowUpPanel job={job} onUpdate={onUpdate} />
      <InterviewPrepPanel job={job} onToast={onToast} />
      {job.coverLetter ? (
        <textarea
          className="letter"
          style={{ minHeight: 160 }}
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
            <Icon name="external" /> Posting
          </a>
        </div>
        <button className="btn icon quiet" type="button" aria-label="Delete from tracker" onClick={onDelete}>
          <Icon name="trash" />
        </button>
      </div>
    </Sheet>
  );
}
