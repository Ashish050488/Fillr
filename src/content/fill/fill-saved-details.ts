import { collectFillables, type Fillable } from '../form/collect-fillable-fields';
import { findDeclarationTopic } from '../../shared/answers/declaration-topics';
import {
  chooseOptionForAnswer,
  findChoiceButtonGroups,
  isChoiceButton,
  isChoiceSelected,
  pickChoiceButton,
} from '../form/choice-button-groups';
import { bestMatch, matchLabelToProfile } from '../form/match-profile-field';
import { fillDatePicker, isDatePickerField } from '../form/date-picker';
import { calculateStartDate, parseDate } from '../values/date-values';
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
import { attachResume, findAllFileInputs } from './attach-resume';
import { hasValue } from './fill-report';
import { runSiteRecipe } from '../recipes/run-site-recipe';
import { findSiteRecipe } from '../recipes/site-recipes';
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
  if (isDatePickerField(field)) {
    const date = parseDate(fieldValue) ?? calculateStartDate(fieldValue);
    return date ? fillDatePicker(field as HTMLInputElement, date, fieldValue) : false;
  }
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
  const hiddenUploads = findAllFileInputs().filter(
    (fileInput) => !visibleFields.includes(fileInput) && !fileInput.files?.length,
  );
  for (const fileInput of hiddenUploads)
    if (attachResume(fileInput, profile.resume)) session.filledFields.add(fileInput);
}

/** Button rows ("How did you hear?", "Willing to relocate?") answered from your profile by their question text. */
function fillChoiceRowsFromProfile(profile: FillProfile, session: FillSession): void {
  for (const group of findChoiceButtonGroups()) {
    if (group.buttons.some(isChoiceSelected)) continue;
    const profileMatch = matchLabelToProfile(group.label, profile.values);
    if (!profileMatch) continue;
    const topic = findDeclarationTopic(group.label);
    if (topic && !PROFILE_KEYS_FOR_DECLARATIONS.has(profileMatch.key)) continue;
    if (pickChoiceButton(group.buttons[0]!, profileMatch.value))
      group.buttons.forEach((button) => session.filledFields.add(button));
  }
  fillOptionGroupsFromProfile(profile, session);
}

const optionText = (input: HTMLInputElement) =>
  (input.labels?.[0]?.textContent || input.parentElement?.textContent || input.value || '').trim();

const GROUP_LABEL_SELECTOR = 'legend, label, [class*="label"], [class*="question"], [class*="title"], h3, h4, p';

/** The question above a group of options: the nearest heading-like text outside the options. */
function readOptionGroupLabel(options: HTMLInputElement[]): string {
  let container = options[0]!.parentElement;
  while (container && !options.every((option) => container!.contains(option))) container = container.parentElement;
  for (let depth = 0; container && depth < 3; depth += 1, container = container.parentElement) {
    const heading = Array.from(container.querySelectorAll(GROUP_LABEL_SELECTOR)).find(
      (candidate) => !options.some((option) => candidate.contains(option) || option.labels?.[0] === candidate),
    );
    const text = heading?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return questionLabel(options[0]!);
}

/** Radio and checkbox groups with one name: pick the option your profile value means. */
function fillOptionGroupsFromProfile(profile: FillProfile, session: FillSession): void {
  const groups = new Map<string, HTMLInputElement[]>();
  for (const input of Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
  )) {
    if (!input.name || input.closest('#jobfill-panel-host')) continue;
    groups.set(input.name, [...(groups.get(input.name) ?? []), input]);
  }
  for (const options of groups.values()) {
    if (options.length < 2 || options.some((option) => option.checked || session.isFilled(option))) continue;
    const label = readOptionGroupLabel(options);
    const profileMatch = matchLabelToProfile(label, profile.values);
    if (!profileMatch) continue;
    if (findDeclarationTopic(label) && !PROFILE_KEYS_FOR_DECLARATIONS.has(profileMatch.key)) continue;
    const chosen = options[chooseOptionForAnswer(options.map(optionText), profileMatch.value)];
    if (!chosen) continue;
    chosen.click();
    options.forEach((option) => session.filledFields.add(option));
    session.markFilled(chosen);
  }
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
  // A known ATS gets its exact recipe first; generic matching then fills whatever it does not cover.
  const recipe = isWorkday() ? undefined : findSiteRecipe();
  const recipeControls = recipe ? await runSiteRecipe(recipe, profile, session) : new Set<Element>();
  if (!isWorkday() && profile.resume?.base64) attachToHiddenUploads(profile, visibleFields, session);

  const clickThroughFields: Array<{ field: Fillable; fieldValue: string }> = [];
  for (const field of collectFillables()) {
    if (session.isFilled(field) || insideEntries(field) || recipeControls.has(field)) continue;
    // Automatic passes never retype what is already there (yours, the site's, or an earlier fill).
    if (options.isAutomatic && (attemptedFields.has(field) || hasValue(field))) continue;
    attemptedFields.add(field);
    try {
      if (field.tagName === 'INPUT' && (field as HTMLInputElement).type === 'file') {
        if (attachResume(field, profile.resume)) session.markFilled(field);
        continue;
      }
      // A calendar's label is often not linked to its box: match it by the question text instead.
      const profileMatch =
        bestMatch(field, profile.values) ??
        (isDatePickerField(field) ? matchLabelToProfile(questionLabel(field), profile.values) : undefined);
      if (!profileMatch) continue;
      if (isDeclarationOutsideProfile(field, profileMatch.key)) continue;
      let fieldValue = adaptValue(profileMatch.key, profileMatch.value, describeField(field, options.hasDialCodeField));
      if (fieldValue === undefined) continue;
      // A dial-code search box finds "India (+91)" by the country name, not by "+91".
      if (profileMatch.key === 'phoneCountryCode' && isCombobox(field) && profile.values.country) {
        fieldValue = `${profile.values.country} (+${profileMatch.value.replace(/\D/g, '')})`;
      }
      if (isCombobox(field) || isListboxButton(field) || isDatePickerField(field))
        clickThroughFields.push({ field, fieldValue });
      else if (fillElement(field, fieldValue)) session.markFilled(field, fieldValue);
    } catch {
      // A site-specific control must not prevent filling the rest.
    }
  }
  fillChoiceRowsFromProfile(profile, session);
  options.reportProgress(`Filled ${session.filledFields.size} saved details…`);
  for (const { field, fieldValue } of clickThroughFields) {
    try {
      if (await setFieldValue(field, fieldValue)) session.markFilled(field);
    } catch {
      // Keep going.
    }
  }
}
