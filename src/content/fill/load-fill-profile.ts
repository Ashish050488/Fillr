import { sendMessage } from '../../shared/messaging/extension-messages';
import type { ProfileValues } from '../form/match-profile-field';

/** Your saved values plus the few that sites ask for separately. */
export async function loadFillProfile() {
  const reply = await sendMessage('GET_FILL_PROFILE', undefined);
  if (!reply.success) throw new Error(reply.error ?? 'Add your resume in the JobFill panel first.');
  const values: ProfileValues = Object.fromEntries(
    Object.entries(reply.fields).map(([fieldName, field]) => [fieldName, field.value]),
  );
  const phoneDigits = values.phone?.replace(/\D/g, '') ?? '';
  const dialCode =
    values.phone?.match(/^\s*\+\s*(\d{1,3})/)?.[1] ??
    (/^india$/i.test(values.country ?? '') && phoneDigits.length === 10 ? '91' : undefined);
  if (dialCode && !values.phoneCountryCode) values.phoneCountryCode = dialCode;
  // Workday asks what kind of phone it is, and "How did you hear about us?" is required there.
  if (!values.phoneDeviceType) values.phoneDeviceType = 'Mobile';
  if (!values.heardAbout) values.heardAbout = 'LinkedIn';
  // "Preferred start date": after your notice period, or a month from now.
  if (!values.earliestStart) values.earliestStart = values.noticePeriod || '30 days';
  if (!values.name && (values.firstName || values.lastName)) {
    values.name = [values.firstName, values.lastName].filter(Boolean).join(' ');
  }
  return { values, resume: reply.resume, history: reply.history };
}

export type FillProfile = Awaited<ReturnType<typeof loadFillProfile>>;
