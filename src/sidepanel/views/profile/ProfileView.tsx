import React from 'react';
import Spinner from '../../components/Spinner';
import type { ProfileController } from '../../hooks/useProfileController';
import ProfileFieldGroup from './ProfileFieldGroup';
import { PROFILE_FIELD_GROUPS } from './profile-field-definitions';
import ResumeCard from './ResumeCard';
import ResumeHistory from './ResumeHistory';
import SavedAnswers from './SavedAnswers';
import SkillsEditor from './SkillsEditor';

/** Your resume, every saved detail grouped into sections, skills and resume history. */
export default function ProfileView({ controller }: { controller: ProfileController }) {
  const snapshot = controller.snapshot;
  if (!snapshot)
    return (
      <div className="empty">
        <Spinner />
      </div>
    );
  const { profile, status } = snapshot;
  return (
    <div className="stack fade-in">
      <ResumeCard profile={profile} controller={controller} />
      <label className="field">
        <span>Summary</span>
        <textarea
          className="boxed"
          value={profile.fields.summary?.value ?? ''}
          onChange={(event) => controller.editField('summary', event.target.value)}
        />
      </label>
      <div className="row between">
        <p className="section-title">Your details</p>
        <span className="tiny">{status === 'saving' ? 'saving…' : status === 'error' ? 'not saved' : 'saved'}</span>
      </div>
      {status === 'error' && (
        <p className="note err">
          {snapshot.error}{' '}
          <button className="link" type="button" onClick={controller.retry}>
            Retry
          </button>
        </p>
      )}
      {PROFILE_FIELD_GROUPS.map(([groupTitle, fieldDefinitions]) => (
        <ProfileFieldGroup
          key={groupTitle}
          groupTitle={groupTitle}
          fieldDefinitions={fieldDefinitions}
          profile={profile}
          isInitiallyOpen={groupTitle === 'You'}
          onFieldChange={controller.editField}
        />
      ))}
      <SavedAnswers />
      <SkillsEditor
        skills={profile.skills}
        onChange={(updatedSkills) => controller.editSkills(updatedSkills.join(','))}
      />
      <ResumeHistory profile={profile} />
    </div>
  );
}
