import React, { useEffect, useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Job, JobStatus } from '../../../shared/types';
import DeskDoodle from '../../components/DeskDoodle';
import { useStoredValue } from '../../hooks/useStoredValue';
import ApplicationRow from './ApplicationRow';
import {
  isAppliedThisWeek,
  matchesFilter,
  SUBMITTED_STATUSES,
  TRACKER_FILTERS,
  type TrackerFilter,
} from './tracker-filters';

const SEARCH_SHOWN_ABOVE = 5;

/** Submitted applications only, with real counts, filters, search and per-row details. */
export default function TrackerView({ onToast }: { onToast: (message: string) => void }) {
  const jobs = useStoredValue<Job[]>(STORAGE_KEYS.JOBS, []);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<TrackerFilter>('All');
  const [expandedKey, setExpandedKey] = useState<string>();

  // Older entries saved before titles were resolved get fixed from the ATS API (no AI),
  // and duplicate records from older key rules are merged.
  const untitledCount = jobs.filter(
    (job) => SUBMITTED_STATUSES.includes(job.status) && (!job.jobTitle || !job.company),
  ).length;
  const duplicateCount = jobs.length - new Set(jobs.map((job) => jobKey(job.url))).size;
  useEffect(() => {
    if (untitledCount || duplicateCount) void sendMessage('JOB_REPAIR', undefined).catch(() => undefined);
  }, [untitledCount, duplicateCount]);

  // One row per job even before the background merges older duplicate records.
  const submittedJobs = [...new Map(jobs.map((job) => [jobKey(job.url), job])).values()].filter((job) =>
    SUBMITTED_STATUSES.includes(job.status),
  );
  const visibleJobs = [...submittedJobs]
    .sort((first, second) => second.timestamp - first.timestamp)
    .filter((job) => matchesFilter(job, activeFilter))
    .filter((job) => `${job.jobTitle} ${job.company} ${job.site}`.toLowerCase().includes(searchText.toLowerCase()));
  const interviewCount = submittedJobs.filter((job) => job.status === 'interview' || job.status === 'offer').length;

  const updateJob = (job: Job, patch: { status?: JobStatus; coverLetter?: string }) =>
    sendMessage('JOB_UPDATE', { key: jobKey(job.url), patch });
  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Delete "${job.jobTitle || 'this job'}" from your tracker?`)) return;
    const reply = await sendMessage('JOB_DELETE', { key: jobKey(job.url) });
    onToast(reply.success ? 'Deleted' : (reply.error ?? 'Could not delete.'));
  };

  return (
    <div className="stack fade-in">
      <div className="stat-row">
        <div className="stat">
          <b>{submittedJobs.filter(isAppliedThisWeek).length}</b>
          <span>applied this week</span>
        </div>
        <div className="stat">
          <b>{submittedJobs.length}</b>
          <span>applied total</span>
        </div>
        <div className="stat">
          <b>{interviewCount}</b>
          <span>interviews</span>
        </div>
      </div>
      {submittedJobs.length > 0 && (
        <div className="row between">
          <div className="chips">
            {TRACKER_FILTERS.map((filterName) => (
              <button
                key={filterName}
                type="button"
                className={`chip ${activeFilter === filterName ? 'on' : ''}`}
                onClick={() => setActiveFilter(filterName)}
              >
                {filterName}
              </button>
            ))}
          </div>
          {submittedJobs.length > SEARCH_SHOWN_ABOVE && (
            <input
              className="input"
              style={{ width: 140 }}
              placeholder="Search…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          )}
        </div>
      )}
      {!submittedJobs.length && (
        <div className="empty">
          <DeskDoodle />
          <h2>No applications yet</h2>
          <p className="soft">
            Only applications you actually submit appear here. JobFill adds them automatically when the site confirms
            your submission.
          </p>
        </div>
      )}
      <div className="list">
        {visibleJobs.map((job) => {
          const rowKey = job.key ?? job.id;
          return (
            <ApplicationRow
              key={rowKey}
              job={job}
              isExpanded={expandedKey === rowKey}
              onToggle={() => setExpandedKey(expandedKey === rowKey ? undefined : rowKey)}
              onUpdate={(patch) => updateJob(job, patch)}
              onDelete={() => void handleDelete(job)}
              onToast={onToast}
            />
          );
        })}
      </div>
    </div>
  );
}
