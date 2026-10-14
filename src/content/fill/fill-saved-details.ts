import { collectFillables, type Fillable } from '../form/collect-fillable-fields';
import { findDeclarationTopic } from '../../shared/answers/declaration-topics';
import { isChoiceButton, pickChoiceButton } from '../form/choice-button-groups';
import { bestMatch } from '../form/match-profile-field';
import { questionLabel } from '../page/question-label';
import { fillCombobox, fillListboxButton, isCombobox, isListboxButton } from '../form/searchable-dropdown';
import { fillElement } from '../form/set-field-value';
import { adaptValue } from '../values/adapt-field-value';
import {
  attachWorkdayResume,
  fillWorkdayHistory,
  fillWorkdaySkills,
  insideEntries,
  isWorkday,
} from '../workday/workday-history';
import { attachResume } from './attach-resume';
import { describeField } from './field-shape';
import { attemptedFields, type FillSession } from './fill-session';
import type { FillProfile } from './load-fill-profile';

const PROFILE_KEYS_FOR_DECLARATIONS = new Set(['workAuthorization', 'sponsorship', 'willingToRelocate']);

/**
 * Long legal questions mention words like "countries" or "citizenship" in passing; they are not
 * your Country or Nationality field. Only a Yes/No dropdown about work rights or sponsorship may use
 * your profile; everything else is answered once by you and remembered.
 */
function isDeclarationOutsideProfile(field: Fillable, profileKey: string): boolean {
  if (!findDeclarationTopic(questionLabel(field))) return false;
  const isChoice =
    field instanceof HTMLSelectElement || isListboxButton(field) || (field as HTMLInputElement).type === 'radio';
  return !(isChoice && PROFILE_KEYS_FOR_DECLARATIONS.has(profileKey));
}

/** Type into a plain field, or open and pick from a dropdown that needs clicking. */
export async function setFieldValue(field: Fillable, fieldValue: string): Promise<boolean> {
  if (isChoiceButton(field)) return pickChoiceButton(field, fieldValue);
  if (isListboxButton(field)) return fillListboxButton(field, fieldValue);
  if (isCombobox(field)) return fillCombobox(field, fieldValue);
  return fillElement(field, fieldValue);
}

/** Workday's "My Experience" step: one resume item per added entry, then the resume and skills. */
async function fillWorkdayExperience(
  profile: FillProfile,
  session: FillSession,
  reportProgress: (text: string) => void,
) {
  if (!profile.history) return;
  reportProgress('Adding your work history…');
  for (const field of await fillWorkdayHistory(profile.history)) session.markFilled(field);
  const resumeInput = await attachWorkdayResume(profile.resume);
  if (resumeInput) session.filledFields.add(resumeInput);
  reportProgress('Adding your skills…');
  await fillWorkdaySkills(profile.history.skills, session.filledFields);
}

/** Many ATSs hide the real file input behind a styled "Upload" button: attach there too. */
function attachToHiddenUploads(profile: FillProfile, visibleFields: Fillable[], session: FillSession): void {
  const hiddenUploads = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]')).filter(
    (fileInput) => !visibleFields.includes(fileInput) && !fileInput.files?.length,
  );
  for (const fileInput of hiddenUploads)
    if (attachResume(fileInput, profile.resume)) session.filledFields.add(fileInput);
}

/**
 * Saved details first: all local and instant, no AI. Dropdowns that need clicking (Workday,
 * React selects) go last so plain fields appear filled straight away.
 */
export async function fillSavedDetails(
  profile: FillProfile,
  visibleFields: Fillable[],
  session: FillSession,
  options: { isAutomatic?: boolean; hasDialCodeField: boolean; reportProgress: (text: string) => void },
): Promise<void> {
  if (isWorkday()) await fillWorkdayExperience(profile, session, options.reportProgress);
  else if (profile.resume?.base64) attachToHiddenUploads(profile, visibleFields, session);

  const clickThroughFields: Array<{ field: Fillable; fieldValue: string }> = [];
  for (const field of collectFillables()) {
    if (session.isFilled(field) || insideEntries(field)) continue;
    if (options.isAutomatic && attemptedFields.has(field)) continue;
    attemptedFields.add(field);
    try {
      if (field.tagName === 'INPUT' && (field as HTMLInputElement).type === 'file') {
        if (attachResume(field, profile.resume)) session.markFilled(field);
        continue;
      }
      const profileMatch = bestMatch(field, profile.values);
      if (!profileMatch) continue;
      if (isDeclarationOutsideProfile(field, profileMatch.key)) continue;
      let fieldValue = adaptValue(profileMatch.key, profileMatch.value, describeField(field, options.hasDialCodeField));
      if (fieldValue === undefined) continue;
      // A dial-code search box finds "India (+91)" by the country name, not by "+91".
      if (profileMatch.key === 'phoneCountryCode' && isCombobox(field) && profile.values.country) {
        fieldValue = `${profile.values.country} (+${profileMatch.value.replace(/\D/g, '')})`;
      }
      if (isCombobox(field) || isListboxButton(field)) clickThroughFields.push({ field, fieldValue });
      else if (fillElement(field, fieldValue)) session.markFilled(field, fieldValue);
    } catch {
      // A site-specific control must not prevent filling the rest.
    }
  }
  options.reportProgress(`Filled ${session.filledFields.size} saved details…`);
  for (const { field, fieldValue } of clickThroughFields) {
    try {
      if (await setFieldValue(field, fieldValue)) session.markFilled(field);
    } catch {
      // Keep going.
    }
  }
}
