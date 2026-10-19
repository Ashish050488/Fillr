import React, { useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import type { Job, JobStatus } from '../../../shared/types';
import { openInCurrentTab } from '../../services/active-tab-bridge';
import { peopleSearchUrl } from './quick-people-searches';
import { applicationFollowUp, daysSinceApplied } from './tracker-filters';

/** No reply yet: who to nudge at that company, or mark it a silent no after 45 days. */
export function FollowUpPanel({ job, onUpdate }: { job: Job; onUpdate: (patch: { status?: JobStatus }) => unknown }) {
  const stage = applicationFollowUp(job);
  if (!stage || !job.company) return null;
  const company = job.company;
  return (
    <section className="notice stack-sm">
      <p className="small">
        {stage === 'due'
          ? `No reply for ${daysSinceApplied(job)} days. One short note to someone at ${company} helps; a referral helps most.`
          : `${daysSinceApplied(job)} days without a reply: most likely a silent no.`}
      </p>
      <div className="row">
        <button
          className="btn"
          type="button"
          onClick={() => void openInCurrentTab(peopleSearchUrl([company, 'recruiter'], true))}
        >
          Recruiter at {company}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => void openInCurrentTab(peopleSearchUrl([company, 'engineer'], true))}
        >
          Engineers at {company}
        </button>
        {stage === 'silent' && (
          <button className="btn quiet" type="button" onClick={() => onUpdate({ status: 'rejected' })}>
            Mark as no
          </button>
        )}
      </div>
    </section>
  );
}

type PrepTab = 'questions' | 'stories' | 'askThem';
const PREP_TABS: Array<[PrepTab, string]> = [
  ['questions', 'Likely questions'],
  ['stories', 'Your stories'],
  ['askThem', 'Ask them'],
];

/** "Question | what they check" shown as a bold line with a quiet note. */
function PrepLine({ line }: { line: string }) {
  const [main, note] = line.split(/\s+\|\s+/);
  return (
    <li>
      <span>
        <b>{main}</b>
        {note && <span className="muted">{note}</span>}
      </span>
    </li>
  );
}

/** Interview coming up: likely questions, your matching stories and questions to ask them. */
export function InterviewPrepPanel({ job, onToast }: { job: Job; onToast: (message: string) => void }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [activeTab, setActiveTab] = useState<PrepTab>('questions');
  if (job.status !== 'interview' && job.status !== 'offer') return null;
  const prep = job.interviewPrep;
  const handlePrepare = async () => {
    setIsPreparing(true);
    const reply = await sendMessage('JOB_INTERVIEW_PREP', { key: job.key ?? jobKey(job.url) }).catch(() => undefined);
    setIsPreparing(false);
    if (!reply?.success) onToast(reply?.error ?? 'Could not prepare the interview.');
  };
  return (
    <section className="stack-sm">
      <div className="row between">
        <span className="section-title">Interview prep</span>
        <button
          className="btn"
          type="button"
          disabled={isPreparing}
          aria-busy={isPreparing}
          onClick={() => void handlePrepare()}
        >
          {prep ? 'Redo' : 'Prepare me'}
        </button>
      </div>
      {!prep && !isPreparing && (
        <p className="muted small">Likely questions from this posting, your matching stories, and what to ask them.</p>
      )}
      {prep && (
        <>
          <div className="segments" role="tablist" aria-label="Interview prep">
            {PREP_TABS.map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className="segment"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {label} <span className="count">{prep[tab].length}</span>
              </button>
            ))}
          </div>
          <ul className="points prep-points">
            {prep[activeTab].map((line) => (
              <PrepLine key={line} line={line} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
