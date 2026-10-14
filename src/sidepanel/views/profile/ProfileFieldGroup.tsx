import React from 'react';
import type { Profile } from '../../../shared/types';
import { needsFullWidth, planFullWidthFields } from './field-layout';
import type { ProfileFieldDefinition } from './profile-field-definitions';
import ProfileInput from './ProfileInput';

/** One folding section of your details (You, Links, Work…), laid out two fields per row. */
export default function ProfileFieldGroup({
  groupTitle,
  fieldDefinitions,
  profile,
  isInitiallyOpen,
  onFieldChange,
}: {
  groupTitle: string;
  fieldDefinitions: ProfileFieldDefinition[];
  profile: Profile;
  isInitiallyOpen: boolean;
  onFieldChange: (fieldKey: string, fieldValue: string) => void;
}) {
  const readValue = (definition: ProfileFieldDefinition) => profile.fields[definition.key]?.value ?? '';
  const fullWidthPlan = planFullWidthFields(
    fieldDefinitions.map((definition) => needsFullWidth(definition, readValue(definition))),
  );
  const filledCount = fieldDefinitions.filter((definition) => readValue(definition)).length;
  return (
    <details className="sheet flat" open={isInitiallyOpen}>
      <summary className="row between">
        <b>{groupTitle}</b>
        <span className="small soft">
          {filledCount}/{fieldDefinitions.length}
        </span>
      </summary>
      <div className="pgrid">
        {fieldDefinitions.map((definition, fieldIndex) => (
          <ProfileInput
            key={definition.key}
            definition={definition}
            isFullWidth={fullWidthPlan[fieldIndex]}
            field={profile.fields[definition.key]}
            onChange={(fieldValue) => onFieldChange(definition.key, fieldValue)}
          />
        ))}
      </div>
    </details>
  );
}
