import { searchAndPick } from '../form/searchable-dropdown';
import { findLabelledControl, isWorkday, wait } from './workday-page';

const MAXIMUM_SKILLS = 15;
const BETWEEN_SKILLS_MILLISECONDS = 250;

/** Workday's "Type to Add Skills": each skill is searched and picked; ones Workday lacks are skipped. */
export async function fillWorkdaySkills(skills: string[] | undefined, touched: Set<Element>): Promise<number> {
  if (!isWorkday() || !skills?.length) return 0;
  const skillInput = findLabelledControl(document, /^skills?$/i);
  if (!(skillInput instanceof HTMLInputElement)) return 0;
  const skillField = skillInput.closest('[data-automation-id^="formField"]') ?? skillInput.parentElement;
  let addedCount = 0;
  for (const skill of skills.slice(0, MAXIMUM_SKILLS)) {
    // Already chosen (earlier pass, or by you).
    if ((skillField?.textContent ?? '').toLowerCase().includes(skill.toLowerCase())) continue;
    if (await searchAndPick(skillInput, skill, true)) {
      addedCount += 1;
      await wait(BETWEEN_SKILLS_MILLISECONDS);
    }
  }
  if (addedCount) touched.add(skillInput);
  skillInput.blur();
  return addedCount;
}
