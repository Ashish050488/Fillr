import React, { useCallback, useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Job } from '../../../shared/types';
import DeskDoodle from '../../components/DeskDoodle';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useActiveTab } from '../../hooks/useActiveTab';
import { useStoredValue } from '../../hooks/useStoredValue';
import { fillTab, isFillable, scanTab } from '../../services/active-tab-bridge';
import CoverLetterEditor from './CoverLetterEditor';
import FillActionDock from './FillActionDock';
import FitAnalysis from './FitAnalysis';

const WEAK_FIT_BELOW_SCORE = 55;
const MINIMUM_POSTING_TEXT_LENGTH = 200;
const SUBMITTED_STATUSES = ['applied', 'interview', 'offer', 'rejected'];
type BusyAction = '' | 'check' | 'fill' | 'force';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The job in the current tab: check your fit, read the analysis, edit the letter, autofill. */
export default function JobView({
  onToast,
  onOpenTracker,
}: {
  onToast: (message: string) => void;
  onOpenTracker: () => void;
}) {
  const [busyAction, setBusyAction] = useState<BusyAction>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const clearMessages = useCallback(() => {
    setErrorMessage('');
    setResultMessage('');
  }, []);
  const { currentTab, progressText, setProgressText } = useActiveTab(clearMessages);
  const jobs = useStoredValue<Job[]>(STORAGE_KEYS.JOBS, []);
  const job = currentTab
    ? jobs.find((savedJob) => (savedJob.key ?? jobKey(savedJob.url)) === jobKey(currentTab.url))
    : undefined;

  const runAction = async (action: BusyAction, work: () => Promise<void>) => {
    setBusyAction(action);
    clearMessages();
    setProgressText('');
    try {
      await work();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusyAction('');
      setProgressText('');
    }
  };

  const handleCheckFit = (isRefresh = false) =>
    runAction('check', async () => {
      if (!currentTab) return;
      setProgressText('Reading the page…');
      const scan = await scanTab(currentTab.id);
      if (scan.pageText.length < MINIMUM_POSTING_TEXT_LENGTH) {
        throw new Error('This page has very little text. Open the full job description and try again.');
      }
      const reply = await sendMessage('JOB_PREPARE', { scan, analyzeOnly: true, refresh: isRefresh });
      if (!reply.success) throw new Error(reply.error ?? 'Could not check this job.');
    });

  const handleFill = (isForced: boolean) =>
    runAction(isForced ? 'force' : 'fill', async () => {
      if (!currentTab) return;
      const reply = await fillTab(currentTab.id, isForced);
      if (!reply?.success) throw new Error(reply?.message ?? 'Could not fill this page.');
      if (reply.aiError) setErrorMessage(`Your details are in, but AI answers failed: ${reply.aiError}`);
      setResultMessage(reply.message ?? 'Done.');
    });

  const handleMarkApplied = () => {
    if (!currentTab || !job) return;
    void sendMessage('MARK_JOB_APPLIED', { url: currentTab.url, jobTitle: job.jobTitle, company: job.company }).then(
      () => onToast('Added to your tracker'),
    );
  };

  if (!currentTab || !isFillable(currentTab.url)) {
    return (
      <div className="empty fade-in">
        <DeskDoodle />
        <h2>Open a job posting</h2>
        <p className="muted">Go to any job or application page. JobFill reads it, checks your fit and fills it in.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" type="button" onClick={onOpenTracker}>
            See your applications
          </button>
        </div>
      </div>
    );
  }

  const fit = job?.analysis;
  const isBusy = Boolean(busyAction);
  const canMarkApplied = job && !SUBMITTED_STATUSES.includes(job.status) && (job.fieldsFilled > 0 || job.analysis);
  return (
    <div className="stack fade-in">
      <header className="job-head">
        <p className="tiny">{job?.site || hostnameOf(currentTab.url)}</p>
        <h1>{job?.jobTitle || currentTab.title || 'This page'}</h1>
        {job?.company && (
          <p className="co">
            {job.company}
            {job.jobFacts?.location ? ` · ${job.jobFacts.location}` : ''}
          </p>
        )}
      </header>
      {!fit && busyAction !== 'check' && (
        <section className="sheet stack">
          <p className="section-title">Is this one for you?</p>
          <p className="soft">
            One read of the job description gives you a fit score, a cover letter for this company and answers to every
            question, all saved for autofill.
          </p>
          <button className="btn primary big block" type="button" onClick={() => void handleCheckFit()}>
            Check my fit <Icon name="arrow" />
          </button>
        </section>
      )}
      {isBusy && (
        <div className="progress" role="status">
          <Spinner /> {progressText || (busyAction === 'check' ? 'Reading the job…' : 'Filling the form…')}
        </div>
      )}
      {errorMessage && (
        <p className="note err" role="alert">
          {errorMessage}
        </p>
      )}
      {resultMessage && (
        <p className="note" role="status">
          {resultMessage}
        </p>
      )}
      {fit && <FitAnalysis job={job!} onRecheck={() => void handleCheckFit(true)} isBusy={isBusy} />}
      {job && (fit || job.coverLetter) && <CoverLetterEditor job={job} onToast={onToast} />}
      {canMarkApplied && (
        <p className="small center">
          Submitted it but the tracker missed it?{' '}
          <button className="link" type="button" onClick={handleMarkApplied}>
            Mark as applied
          </button>
        </p>
      )}
      <FillActionDock
        isWeakFit={Boolean(fit && fit.score < WEAK_FIT_BELOW_SCORE)}
        isBusy={isBusy}
        isFilling={busyAction === 'fill'}
        onFill={(isForced) => void handleFill(isForced)}
      />
    </div>
  );
}
