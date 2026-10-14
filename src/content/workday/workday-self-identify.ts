import type { FillSession } from '../fill/fill-session';
import { normalizeLabel, typeInto } from './workday-page';

const DECLINE_CHOICE =
  /\b(do not (want|wish) to answer|don'?t wish to answer|prefer not|decline|not to (answer|disclose))\b/i;
const DISABILITY_FIELD = '[data-automation-id^="formField-disability"], [data-automation-id*="disabilityStatus"]';
const SIGNATURE_DATE_FIELD = '[data-automation-id="formField-dateSignedOn"], [data-automation-id*="dateSignedOn"]';
const SIGNATURE_NAME_FIELD = '[data-automation-id="formField-name"]';

const labelOf = (input: HTMLInputElement) =>
  normalizeLabel(
    Array.from(input.labels ?? [])
      .map((label) => label.textContent)
      .join(' ') || input.closest('[role="cell"], label, div')?.textContent,
  );

/** The disability form's checkboxes: tick "I do not want to answer", never a real answer. */
function declineDisabilityQuestion(session: FillSession): void {
  for (const field of Array.from(document.querySelectorAll<HTMLElement>(DISABILITY_FIELD))) {
    const checkboxes = Array.from(field.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    if (checkboxes.some((checkbox) => checkbox.checked || checkbox.getAttribute('aria-checked') === 'true')) continue;
    const declineCheckbox = checkboxes.find((checkbox) => DECLINE_CHOICE.test(labelOf(checkbox)));
    if (!declineCheckbox) continue;
    declineCheckbox.click();
    session.markFilled(declineCheckbox);
  }
}

/** The form is signed with your name and today's date (Workday splits it into Month, Day, Year boxes). */
function signSelfIdentifyForm(fullName: string | undefined, session: FillSession): void {
  const nameInput = document.querySelector<HTMLInputElement>(`${SIGNATURE_NAME_FIELD} input[type="text"]`);
  if (nameInput && !nameInput.value.trim() && fullName && typeInto(nameInput, fullName)) session.markFilled(nameInput);

  const dateField = document.querySelector<HTMLElement>(SIGNATURE_DATE_FIELD);
  if (!dateField) return;
  const today = new Date();
  const dateParts: Array<[RegExp, string]> = [
    [/month/i, String(today.getMonth() + 1).padStart(2, '0')],
    [/day/i, String(today.getDate()).padStart(2, '0')],
    [/year/i, String(today.getFullYear())],
  ];
  const dateInputs = Array.from(dateField.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'));
  for (const [partPattern, partValue] of dateParts) {
    const partInput = dateInputs.find((input) =>
      partPattern.test(`${input.getAttribute('data-automation-id')} ${input.getAttribute('aria-label')}`),
    );
    if (partInput && !partInput.value.trim() && typeInto(partInput, partValue)) session.markFilled(partInput);
  }
}

/**
 * Workday's "Self Identify" step (US disability form): decline the disability question and sign
 * with your name and today's date. Gender, ethnicity and veteran dropdowns are declined elsewhere.
 */
export function fillWorkdaySelfIdentify(fullName: string | undefined, session: FillSession): void {
  if (!document.querySelector(DISABILITY_FIELD)) return;
  declineDisabilityQuestion(session);
  signSelfIdentifyForm(fullName, session);
}
