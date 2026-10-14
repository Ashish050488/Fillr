import React, { useEffect, useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import type { AnswerStyle, Job } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { copyText, downloadText } from '../../services/text-export';
import Dropdown from '../../components/Dropdown';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
];
const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

/** This company's cover letter: edit it (saved on blur), rewrite it in another tone, copy or download it. */
export default function CoverLetterEditor({ job, onToast }: { job: Job; onToast: (message: string) => void }) {
  const [letterDraft, setLetterDraft] = useState(job.coverLetter ?? '');
  const [style, setStyle] = useState<AnswerStyle>({ tone: 'professional', length: 'medium' });
  const [isWriting, setIsWriting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    setLetterDraft(job.coverLetter ?? '');
  }, [job.coverLetter]);
  const key = job.key ?? jobKey(job.url);

  const handleSave = async () => {
    if (letterDraft === (job.coverLetter ?? '')) return;
    const reply = await sendMessage('JOB_UPDATE', { key, patch: { coverLetter: letterDraft } });
    if (reply.success) onToast('Letter saved for this company');
  };
  const handleRewrite = async () => {
    setIsWriting(true);
    setErrorMessage('');
    try {
      const reply = await sendMessage('JOB_COVER_LETTER', { key, style });
      if (!reply.success) throw new Error(reply.error ?? 'Could not write the letter.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not write the letter.');
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <section className="stack-sm">
      <p className="section-title">
        Cover letter <small>for {job.company || 'this company'}</small>
      </p>
      {letterDraft ? (
        <textarea
          className="letter"
          value={letterDraft}
          onChange={(event) => setLetterDraft(event.target.value)}
          onBlur={() => void handleSave()}
          aria-label="Cover letter"
        />
      ) : (
        <p className="note">No letter yet: the fit was low, so JobFill saved your quota. Write one anyway below.</p>
      )}
      {errorMessage && <p className="note err">{errorMessage}</p>}
      <div className="row between">
        <div className="row">
          <Dropdown
            isCompact
            ariaLabel="Tone"
            value={style.tone ?? 'professional'}
            options={TONE_OPTIONS}
            onChange={(tone) => setStyle({ ...style, tone: tone as AnswerStyle['tone'] })}
          />
          <Dropdown
            isCompact
            ariaLabel="Length"
            value={style.length ?? 'medium'}
            options={LENGTH_OPTIONS}
            onChange={(length) => setStyle({ ...style, length: length as AnswerStyle['length'] })}
          />
          <button className="btn" type="button" disabled={isWriting} onClick={() => void handleRewrite()}>
            {isWriting ? <Spinner /> : <Icon name="redo" />} {letterDraft ? 'Rewrite' : 'Write'}
          </button>
        </div>
        {letterDraft && (
          <div className="row">
            <button
              className="btn icon quiet"
              type="button"
              title="Copy"
              onClick={() => void copyText(letterDraft).then(() => onToast('Copied'))}
            >
              <Icon name="copy" />
            </button>
            <button
              className="btn icon quiet"
              type="button"
              title="Download"
              onClick={() => downloadText(`Cover letter - ${job.company || 'job'}.txt`, letterDraft)}
            >
              <Icon name="download" />
            </button>
            <a className="btn icon quiet" href={job.url} target="_blank" rel="noreferrer" title="Open posting">
              <Icon name="external" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
