import React, { useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import type { ProfileController } from '../../hooks/useProfileController';
import KeyManager from '../settings/KeyManager';

/** First-run steps shown on the Job tab until a key and a resume are saved. */
export default function SetupView({
  hasKey,
  onKeyAdded,
  controller,
}: {
  hasKey: boolean;
  onKeyAdded: () => void;
  controller: ProfileController;
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const handleResumeFile = (file?: File) => {
    if (file && !controller.busy) void controller.upload(file);
  };
  return (
    <div className="stack fade-in">
      <div className="stack-sm" style={{ padding: '6px 0 4px' }}>
        <h1 className="hand" style={{ fontSize: 40, lineHeight: 1 }}>
          Apply in one click.
        </h1>
        <p className="soft">
          JobFill reads each job, tells you honestly if it fits, then fills the whole application with a cover letter
          written for that company. Two quick steps.
        </p>
      </div>
      <ol className="steps">
        <li className={hasKey ? 'done' : ''}>
          <div className="stack-sm">
            <b>Add a free Gemini key</b>
            {hasKey ? <p className="muted small">Done.</p> : <KeyManager isCompact onKeyAdded={onKeyAdded} />}
          </div>
        </li>
        <li className={controller.snapshot?.profile.resume ? 'done' : ''}>
          <div className="stack-sm">
            <b>
              {controller.snapshot?.profile.resume
                ? `Resume saved: ${controller.snapshot.profile.resume.fileName}`
                : 'Drop in your resume'}
            </b>
            <label
              className={`drop ${isDraggingOver ? 'over' : ''}`}
              style={{ opacity: hasKey ? 1 : 0.5, pointerEvents: hasKey ? 'auto' : 'none' }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingOver(false);
                handleResumeFile(event.dataTransfer.files[0]);
              }}
            >
              <Icon name="document" />
              <b className="hand" style={{ fontSize: 22 }}>
                {controller.busy ? 'Reading…' : 'Drop PDF or click'}
              </b>
              <span className="muted small">Gemini turns it into your profile</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={!hasKey}
                onChange={(event) => {
                  handleResumeFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            {controller.feedback && (
              <p className={controller.feedback.kind === 'error' ? 'note err' : 'progress'}>
                {controller.feedback.kind === 'working' && <Spinner />} {controller.feedback.text}
              </p>
            )}
          </div>
        </li>
      </ol>
    </div>
  );
}
