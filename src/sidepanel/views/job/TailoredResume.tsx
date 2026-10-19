import React, { useState } from 'react';
import { jobKey } from '../../../shared/jobs/job-key';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import type { Job, TailoredResume as TailoredResumeData } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { copyText, downloadText } from '../../services/text-export';

/** The tailored summary and bullets as plain text, ready to paste into your resume. */
export function formatTailoredResume(tailored: TailoredResumeData): string {
  return [
    'SUMMARY',
    tailored.summary,
    '',
    'EXPERIENCE BULLETS',
    ...tailored.bullets.map((bullet) => `• ${bullet.text}${bullet.source ? `  (${bullet.source})` : ''}`),
  ].join('\n');
}

/**
 * "Tailor my resume": a summary and your six best bullets rewritten in this posting's words,
 * plus which of its keywords you now cover and which you really lack. Never invents experience.
 */
export default function TailoredResume({ job, onToast }: { job: Job; onToast: (message: string) => void }) {
  const [isTailoring, setIsTailoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const tailored = job.tailoredResume;

  const handleTailor = async () => {
    setIsTailoring(true);
    setErrorMessage('');
    const reply = await sendMessage('JOB_TAILOR_RESUME', { key: job.key ?? jobKey(job.url) }).catch(() => undefined);
    setIsTailoring(false);
    if (!reply?.success) setErrorMessage(reply?.error ?? 'Could not tailor your resume.');
  };
  const handleCopy = (text: string) => void copyText(text).then(() => onToast('Copied'));

  return (
    <section className="stack-sm tailored-resume">
      <div className="row between">
        <p className="section-title">
          Tailored resume <small>for {job.company || 'this job'}</small>
        </p>
        <button
          className={tailored ? 'btn' : 'btn primary'}
          type="button"
          disabled={isTailoring}
          aria-busy={isTailoring}
          onClick={() => void handleTailor()}
        >
          {isTailoring ? <Spinner /> : <Icon name="redo" />} {tailored ? 'Redo' : 'Tailor my resume'}
        </button>
      </div>
      {!tailored && !isTailoring && (
        <p className="muted small">
          Your summary and best bullets in this posting&apos;s own words. Only real experience, nothing invented.
        </p>
      )}
      {errorMessage && <p className="note err">{errorMessage}</p>}
      {tailored && (
        <>
          {tailored.keywordsCovered.length > 0 && (
            <div className="chips" aria-label="Keywords you now cover">
              {tailored.keywordsCovered.map((keyword) => (
                <span key={keyword} className="chip">
                  ✓ {keyword}
                </span>
              ))}
            </div>
          )}
          {tailored.keywordsMissing.length > 0 && (
            <div className="chips" aria-label="Keywords you lack">
              {tailored.keywordsMissing.map((keyword) => (
                <span key={keyword} className="chip missing" title="Not in your profile: learn it or leave it out">
                  ✗ {keyword}
                </span>
              ))}
            </div>
          )}
          <button className="tailored-line" type="button" title="Copy" onClick={() => handleCopy(tailored.summary)}>
            <b>Summary</b> {tailored.summary}
          </button>
          {tailored.bullets.map((bullet) => (
            <button
              key={bullet.text}
              className="tailored-line"
              type="button"
              title="Copy"
              onClick={() => handleCopy(bullet.text)}
            >
              {bullet.source && <b>{bullet.source}</b>} {bullet.text}
            </button>
          ))}
          <div className="row end">
            <button
              className="btn icon quiet"
              type="button"
              title="Copy all"
              onClick={() => handleCopy(formatTailoredResume(tailored))}
            >
              <Icon name="copy" />
            </button>
            <button
              className="btn icon quiet"
              type="button"
              title="Download"
              onClick={() =>
                downloadText(`Tailored resume - ${job.company || 'job'}.txt`, formatTailoredResume(tailored))
              }
            >
              <Icon name="download" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
