import { attachResumeFile } from '../fill/attach-resume';
import type { FillSession } from '../fill/fill-session';
import type { FillProfile } from '../fill/load-fill-profile';
import { fillElement, nativeSet, notifyChange } from '../form/set-field-value';
import { deepQueryAll, queryFirst } from './deep-query';
import { pickCityOption, pickNamedOption } from './pick-option';
import type { RecipeField, SiteRecipe } from './recipe-types';

const TYPING_DELAY_MILLISECONDS = 40;
const OPTION_WAIT_MILLISECONDS = 4000;
const POLL_MILLISECONDS = 100;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const optionText = (option: Element) =>
  (option.getAttribute('label') || option.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

function clickLikeAPerson(element: Element): void {
  const MouseEventConstructor = element.ownerDocument.defaultView?.MouseEvent ?? MouseEvent;
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    element.dispatchEvent(new MouseEventConstructor(type, { bubbles: true, composed: true, cancelable: true }));
  }
}

function pressEscape(element: Element): void {
  const KeyboardEventConstructor = element.ownerDocument.defaultView?.KeyboardEvent ?? KeyboardEvent;
  element.dispatchEvent(new KeyboardEventConstructor('keydown', { key: 'Escape', bubbles: true, composed: true }));
}

/** Visible options in the field's scope, polled until they render. */
async function waitForOptions(field: RecipeField): Promise<HTMLElement[]> {
  const scope = (field.optionScope && deepQueryAll(field.optionScope)[0]) || document;
  for (let elapsed = 0; elapsed < OPTION_WAIT_MILLISECONDS; elapsed += POLL_MILLISECONDS) {
    const options = deepQueryAll(field.optionSelector ?? '[role="option"]', scope).filter(optionText);
    if (options.length) return options;
    await wait(POLL_MILLISECONDS);
  }
  return [];
}

/** Type a letter at a time so the site's own search runs, as it does for a person. */
async function typeSlowly(input: HTMLInputElement, text: string): Promise<void> {
  input.focus();
  for (let length = 1; length <= text.length; length += 1) {
    nativeSet(input, 'value', text.slice(0, length));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }));
    await wait(TYPING_DELAY_MILLISECONDS);
  }
}

async function fillAutocomplete(input: HTMLInputElement, field: RecipeField, value: string): Promise<boolean> {
  const query = value.split(',')[0]?.trim() ?? '';
  if (!query) return false;
  await typeSlowly(input, query);
  const options = await waitForOptions(field);
  const chosen = pickCityOption(
    options.map((option) => ({ option, text: optionText(option) })),
    value,
  );
  if (!chosen) return false;
  clickLikeAPerson(chosen);
  pressEscape(input);
  return true;
}

async function fillChoice(trigger: HTMLElement, field: RecipeField, value: string): Promise<boolean> {
  clickLikeAPerson(trigger);
  const options = await waitForOptions(field);
  const chosen = pickNamedOption(
    options.map((option) => ({ option, text: optionText(option) })),
    value,
  );
  if (!chosen) return false;
  chosen.scrollIntoView?.({ block: 'nearest' });
  clickLikeAPerson(chosen);
  return true;
}

function attachResume(input: HTMLInputElement, profile: FillProfile): boolean {
  const resume = profile.resume;
  if (!resume?.base64 || input.files?.length) return false;
  attachResumeFile(input, resume.base64, resume.fileName);
  notifyChange(input);
  return true;
}

async function fillRecipeField(element: HTMLElement, field: RecipeField, profile: FillProfile): Promise<boolean> {
  if (field.kind === 'resume') return attachResume(element as HTMLInputElement, profile);
  const value = profile.values[field.profileKey];
  if (!value) return false;
  if (field.kind === 'autocomplete') return fillAutocomplete(element as HTMLInputElement, field, value);
  if (field.kind === 'choice') return fillChoice(element, field, value);
  return fillElement(element, value);
}

/**
 * Fill what the recipe knows exactly: resume first, a pause while the site reads it, then the rest.
 * Returns the controls it owns so the generic pass leaves them alone, even when a value was missing.
 */
export async function runSiteRecipe(recipe: SiteRecipe, profile: FillProfile, session: FillSession) {
  const ownedControls = new Set<Element>();
  for (const field of recipe.fields) {
    const element = queryFirst(field.selectors);
    if (!element || session.isFilled(element)) continue;
    if (field.kind !== 'text') ownedControls.add(element);
    try {
      const isFilled = await fillRecipeField(element, field, profile);
      if (!isFilled) continue;
      if (field.kind === 'resume') {
        session.filledFields.add(element);
        if (recipe.resumeParseWaitMilliseconds) await wait(recipe.resumeParseWaitMilliseconds);
      } else session.markFilled(element, field.kind === 'text' ? profile.values[field.profileKey] : undefined);
    } catch {
      // One unusual control must not stop the rest of the form.
    }
  }
  return ownedControls;
}
