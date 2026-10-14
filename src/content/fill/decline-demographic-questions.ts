import type { Fillable } from '../form/collect-fillable-fields';
import { fillListboxButton, isListboxButton, readListboxOptions } from '../form/searchable-dropdown';
import { fillElement } from '../form/set-field-value';
import { questionLabel, SENSITIVE } from '../page/collect-questions';
import { declineOption } from '../values/adapt-field-value';
import { describeField } from './field-shape';
import type { FillSession } from './fill-session';

/**
 * Gender, ethnicity, veteran and disability questions: never guess, but choose
 * "Decline to self-identify" when the form offers it (dropdowns, radios, Workday buttons).
 */
export async function declineDemographicQuestions(fields: Fillable[], session: FillSession, hasDialCodeField: boolean) {
  for (const field of fields) {
    if (session.isFilled(field) || !SENSITIVE.test(questionLabel(field))) continue;
    try {
      if (isListboxButton(field)) {
        const declineChoice = declineOption(await readListboxOptions(field));
        if (declineChoice && (await fillListboxButton(field, declineChoice))) session.markFilled(field);
        continue;
      }
      if (!(field instanceof HTMLSelectElement || (field as HTMLInputElement).type === 'radio')) continue;
      const options = describeField(field, hasDialCodeField).options;
      const declineChoice = options && declineOption(options);
      if (declineChoice && fillElement(field, declineChoice)) session.markFilled(field);
    } catch {
      // Optional nicety: never block the rest of the fill.
    }
  }
}
