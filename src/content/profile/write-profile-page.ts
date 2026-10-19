import { onMessage } from '../../shared/messaging/extension-messages';
import { searchAndPick } from '../form/searchable-dropdown';
import { fitLength, nativeSet, notifyChange } from '../form/set-field-value';
import { PROFILE_FIELD_ATTRIBUTE, readProfilePage } from './read-profile-page';

/**
 * Writes the side panel's rewrite into your profile page. It only types into the boxes; you read
 * it and press the site's own Save, so nothing is published without you.
 */

const FLASH_MILLISECONDS = 1400;
const SKILL_GAP_MILLISECONDS = 250;

const findBox = (fieldId: string) =>
  document.querySelector<HTMLElement>(`[${PROFILE_FIELD_ATTRIBUTE}="${CSS.escape(fieldId)}"]`);

/** A short outline so you can see which box just changed. */
function flash(box: HTMLElement): void {
  box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const previousOutline = box.style.outline;
  box.style.outline = '2px dashed #111';
  window.setTimeout(() => {
    box.style.outline = previousOutline;
  }, FLASH_MILLISECONDS);
}

/** Replaces the text in one box, the way a person would, so the site's own form sees the change. */
export function writeProfileField(fieldId: string, value: string, maxLength?: number): boolean {
  const box = findBox(fieldId);
  if (!box || !box.isConnected) return false;
  const text = fitLength(value, maxLength ?? 0);
  box.focus();
  if (box.tagName === 'TEXTAREA' || box.tagName === 'INPUT') nativeSet(box, 'value', text);
  else {
    // Rich text editors only accept typing through the editing commands.
    document.execCommand('selectAll');
    document.execCommand('insertText', false, text);
  }
  notifyChange(box);
  flash(box);
  return true;
}

/** Adds skills one by one through the site's skill search; returns those it could pick. */
export async function addProfileSkills(skills: string[]): Promise<string[]> {
  const skillsField = readProfilePage().fields.find((field) => field.kind === 'skills');
  const skillsBox = skillsField && findBox(skillsField.id);
  if (!(skillsBox instanceof HTMLInputElement)) return [];
  const added: string[] = [];
  for (const skill of skills) {
    if (await searchAndPick(skillsBox, skill, true)) added.push(skill);
    await new Promise((resolve) => window.setTimeout(resolve, SKILL_GAP_MILLISECONDS));
  }
  if (added.length) flash(skillsBox);
  return added;
}

/** The side panel reads and writes your profile page through these. */
export function registerProfilePageHandlers(): void {
  onMessage('PROFILE_PAGE_SCAN', () => ({ success: true, scan: readProfilePage() }));
  onMessage('PROFILE_PAGE_WRITE', ({ fieldId, value, maxLength }) =>
    writeProfileField(fieldId, value, maxLength)
      ? { success: true }
      : { success: false, error: 'That box is no longer on the page. Press Rescan and try again.' },
  );
  onMessage('PROFILE_PAGE_ADD_SKILLS', async ({ skills }) => {
    const added = await addProfileSkills(skills.slice(0, 15));
    return added.length
      ? { success: true, added }
      : { success: false, added, error: 'The skill search did not offer these. Add them by hand.' };
  });
}
