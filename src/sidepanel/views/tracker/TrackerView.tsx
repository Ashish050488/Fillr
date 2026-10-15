import React, { useEffect, useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Job, JobStatus, Referral } from '../../../shared/types';
import DeskDoodle from '../../components/DeskDoodle';
import StatStrip from '../../components/StatStrip';
import { useStoredValue } from '../../hooks/useStoredValue';
import ApplicationRow from './ApplicationRow';
import ApplicationSheet from './ApplicationSheet';
import ReferralList from './ReferralList';
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
  const [openKey, setOpenKey] = useState<string>();
  const referrals = useStoredValue<Referral[]>(STORAGE_KEYS.REFERRALS, []);
  const sentReferralCount = referrals.filter((referral) => referral.status !== 'drafted').length;
  const [isShowingReferrals, setIsShowingReferrals] = useState(false);

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

  const sectionCounts = { Applications: submittedJobs.length, Referrals: sentReferralCount };
  const sectionSwitch = (
    <div className="segments" role="tablist" aria-label="Tracker section">
      {(['Applications', 'Referrals'] as const).map((sectionName) => (
        <button
          key={sectionName}
          type="button"
          role="tab"
          className="segment"
          aria-selected={(sectionName === 'Referrals') === isShowingReferrals}
          onClick={() => setIsShowingReferrals(sectionName === 'Referrals')}
        >
          {sectionName} <span className="count">{sectionCounts[sectionName]}</span>
        </button>
      ))}
    </div>
  );
  if (isShowingReferrals)
    return (
      <div className="stack fade-in">
        {sectionSwitch}
        <ReferralList onToast={onToast} />
      </div>
    );

  const openJob = visibleJobs.find((job) => (job.key ?? job.id) === openKey);
  return (
    <div className="stack fade-in">
      {sectionSwitch}
      <StatStrip
        stats={[
          { value: submittedJobs.filter(isAppliedThisWeek).length, label: 'this week' },
          { value: submittedJobs.length, label: 'applied' },
          { value: interviewCount, label: 'interviews' },
        ]}
      />
      {submittedJobs.length > 0 && (
        <div className="chips one-line">
          {TRACKER_FILTERS.map((filterName) => (
            <button
              key={filterName}
              type="button"
              className={`chip ${activeFilter === filterName ? 'on' : ''}`}
              onClick={() => setActiveFilter(filterName)}
            >
              {filterName}
              <span className="count">{submittedJobs.filter((job) => matchesFilter(job, filterName)).length}</span>
            </button>
          ))}
        </div>
      )}
      {submittedJobs.length > SEARCH_SHOWN_ABOVE && (
        <input
          className="input"
          type="search"
          placeholder="Search title, company or site…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
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
        {visibleJobs.map((job) => (
          <ApplicationRow key={job.key ?? job.id} job={job} onOpen={() => setOpenKey(job.key ?? job.id)} />
        ))}
      </div>
      {openJob && (
        <ApplicationSheet
          job={openJob}
          onClose={() => setOpenKey(undefined)}
          onUpdate={(patch) => updateJob(openJob, patch)}
          onDelete={() => void handleDelete(openJob).then(() => setOpenKey(undefined))}
          onToast={onToast}
        />
      )}
    </div>
  );
}
