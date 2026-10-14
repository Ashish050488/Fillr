import type { ProfileFieldDefinition } from './profile-field-definitions';

// A half-width field shows about 24 characters; anything longer would be cut off.
const HALF_WIDTH_CHARACTER_LIMIT = 24;
const ALWAYS_FULL_WIDTH_KEYS = new Set(['email', 'addressLine1', 'headline', 'currentTitle']);

/** Links, emails, long values and the three date dropdowns need the whole row. */
export function needsFullWidth(definition: ProfileFieldDefinition, fieldValue: string): boolean {
  return (
    definition.type === 'date' ||
    definition.type === 'url' ||
    ALWAYS_FULL_WIDTH_KEYS.has(definition.key) ||
    fieldValue.length > HALF_WIDTH_CHARACTER_LIMIT
  );
}

/**
 * Two fields per row; a field that would sit alone in its row (its partner went full width, or it
 * is the last one) takes the whole row instead of leaving a gap beside it.
 */
export function planFullWidthFields(widthNeeds: boolean[]): boolean[] {
  const isFullWidth = [...widthNeeds];
  let fieldIndex = 0;
  while (fieldIndex < isFullWidth.length) {
    if (isFullWidth[fieldIndex]) {
      fieldIndex += 1;
      continue;
    }
    const hasHalfWidthPartner = fieldIndex + 1 < isFullWidth.length && !isFullWidth[fieldIndex + 1];
    if (hasHalfWidthPartner) fieldIndex += 2;
    else {
      isFullWidth[fieldIndex] = true;
      fieldIndex += 1;
    }
  }
  return isFullWidth;
}
