import { fieldSignals } from '../form/match-profile-field';
import type { Fillable } from '../form/collect-fillable-fields';
import { questionLabel } from '../page/collect-questions';
import type { FieldShape } from '../values/adapt-field-value';

const normalizeWhitespace = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

function radioGroup(radio: HTMLInputElement): HTMLInputElement[] {
  if (!radio.name) return [radio];
  return Array.from(radio.ownerDocument.getElementsByName(radio.name)).filter(
    (groupMember): groupMember is HTMLInputElement =>
      groupMember instanceof HTMLInputElement && groupMember.type === 'radio',
  );
}

function radioLabel(radio: HTMLInputElement): string {
  const labelText = Array.from(radio.labels ?? [])
    .map((label) => label.textContent)
    .join(' ');
  return normalizeWhitespace(labelText) || radio.value;
}

/** What a field asks for and accepts: its label, type, choices and length limit. */
export function describeField(field: Fillable, hasDialCodeField: boolean): FieldShape {
  const input = field as HTMLInputElement;
  let options: string[] | undefined;
  if (field instanceof HTMLSelectElement) {
    options = Array.from(field.options)
      .filter((option, optionIndex) => optionIndex > 0 || option.value)
      .map((option) => normalizeWhitespace(option.textContent))
      .filter(Boolean);
  }
  if (input.type === 'radio') options = radioGroup(input).map(radioLabel);
  return {
    label: `${questionLabel(field)} ${fieldSignals(field).join(' ')}`,
    type: input.type ?? '',
    options,
    maxLength: input.maxLength > 0 ? input.maxLength : undefined,
    dialCodeField: hasDialCodeField,
  };
}

/** Whether the form asks for the phone country code in a field of its own. */
export function hasDialCodeField(fields: Fillable[]): boolean {
  return fields.some((field) => /\b(country|dial|isd|calling)( phone)? code\b/.test(fieldSignals(field).join(' ')));
}
