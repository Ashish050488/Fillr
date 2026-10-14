import React, { useMemo, useState } from 'react';
import type { ProfileField } from '../../../shared/types';
import { BLANK_FIELD_NOTES, type ProfileFieldDefinition } from './profile-field-definitions';
import DateInput from '../../components/DateInput';
import Dropdown from '../../components/Dropdown';

const OTHER_OPTION = '__other__';

/** One field: label on a single line, a "resume" tag, and a dropdown or text box below. */
export default function ProfileInput({
  definition,
  field,
  isFullWidth,
  onChange,
}: {
  definition: ProfileFieldDefinition;
  isFullWidth: boolean;
  field?: ProfileField;
  onChange: (fieldValue: string) => void;
}) {
  const fieldValue = field?.value ?? '';
  const optionSource = definition.options;
  const options = useMemo(() => (typeof optionSource === 'function' ? optionSource() : optionSource), [optionSource]);
  const isListedValue =
    !fieldValue || Boolean(options?.some((option) => option.toLowerCase() === fieldValue.toLowerCase()));
  const [isTypingOwnAnswer, setIsTypingOwnAnswer] = useState(false);
  const inputId = `profile-field-${definition.key}`;
  return (
    <div className={`pfield ${isFullWidth ? 'pfield-full' : ''}`}>
      <label className="pfield-head" htmlFor={inputId}>
        <span className="pfield-label">{definition.label}</span>
        {field?.source === 'ai' && fieldValue && <span className="pfield-tag">resume</span>}
      </label>
      {options && !isTypingOwnAnswer ? (
        <Dropdown
          id={inputId}
          value={
            isListedValue
              ? (options.find((option) => option.toLowerCase() === fieldValue.toLowerCase()) ?? '')
              : fieldValue
          }
          options={[
            // A value from your resume that is not in the list stays selected as-is.
            ...(isListedValue ? [] : [fieldValue]),
            ...options,
          ]
            .map((option) => ({ value: option, label: option }))
            .concat({ value: OTHER_OPTION, label: 'Other…' })}
          onChange={(chosenValue) => {
            if (chosenValue === OTHER_OPTION) setIsTypingOwnAnswer(true);
            else onChange(chosenValue);
          }}
        />
      ) : definition.type === 'date' ? (
        <DateInput id={inputId} value={fieldValue} onChange={onChange} />
      ) : (
        <input
          id={inputId}
          type={definition.type ?? 'text'}
          placeholder={definition.placeholder ?? (options ? 'Type your answer' : '')}
          value={fieldValue}
          autoFocus={isTypingOwnAnswer}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (options && !fieldValue) setIsTypingOwnAnswer(false);
          }}
        />
      )}
      {/* Always present (often empty) so every field has the same three rows and rows line up. */}
      <span className="pfield-note">{!fieldValue ? BLANK_FIELD_NOTES[definition.key] : undefined}</span>
    </div>
  );
}
