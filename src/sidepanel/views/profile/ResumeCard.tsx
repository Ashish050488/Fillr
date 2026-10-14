import React, { useState } from 'react';
import type { Profile } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import type { ProfileController } from '../../hooks/useProfileController';

/** Your resume file: drop or replace it, re-read it, and any notes about restoring it. */
export default function ResumeCard({ profile, controller }: { profile: Profile; controller: ProfileController }) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const handleFileChosen = (file?: File) => {
    if (file && !controller.busy) void controller.upload(file);
  };
  const feedback = controller.feedback;
  return (
    <section className="stack-sm">
      {profile.resume ? (
        <div className="sheet row between">
          <div className="row grow">
            <span style={{ width: 30, height: 30, display: 'inline-flex' }}>
              <Icon name="document" />
            </span>
            <div className="grow">
              <b>{profile.resume.fileName}</b>
              <p className="muted small">Added {new Date(profile.resume.uploadDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="row">
            <button
              className="btn icon quiet"
              type="button"
              title="Read it again"
              disabled={controller.busy}
              onClick={() => void controller.parse()}
            >
              <Icon name="redo" />
            </button>
            <label className="btn" style={{ cursor: 'pointer' }}>
              Replace
              <input
                hidden
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  handleFileChosen(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      ) : (
        <label
          className={`drop ${isDraggingOver ? 'over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingOver(false);
            handleFileChosen(event.dataTransfer.files[0]);
          }}
        >
          <Icon name="document" />
          <b className="hand" style={{ fontSize: 22 }}>
            Drop your resume
          </b>
          <span className="muted small">PDF · read on your device · Gemini fills your profile</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              handleFileChosen(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      )}
      {profile.resume && !profile.resume.base64 && (
        <p className="note">
          Your profile was restored from your Chrome backup. Re-upload the same PDF once so it can be attached to
          applications. It will not be parsed again.
        </p>
      )}
      {profile.resume && !profile.resume.links && (
        <p className="note">
          Replace your resume once so JobFill can also read the LinkedIn, GitHub and portfolio links hidden behind text
          in the PDF.
        </p>
      )}
      {feedback && (
        <p
          className={feedback.kind === 'error' ? 'note err' : feedback.kind === 'working' ? 'progress' : 'note'}
          role="status"
        >
          {feedback.kind === 'working' && <Spinner />} {feedback.text}
        </p>
      )}
    </section>
  );
}
