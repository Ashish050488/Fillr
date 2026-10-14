import { profileSchema } from '../../shared/schemas';
import { getStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import { derivedFields } from '../../shared/resume/derived-profile-fields';
import type { MessageMap } from '../../shared/types';

type FillProfileReply = MessageMap['GET_FILL_PROFILE']['response'];

const EMPTY_PROFILE_MESSAGE =
  'Your JobFill profile is empty. Open the JobFill panel and add your resume first. Nothing was filled.';

/**
 * Everything a page needs to fill an application: your saved values, values derived from the
 * parsed resume for fields you left blank, the PDF to attach, and your work/education history.
 * An empty profile is refused rather than half-filling a real application.
 */
export async function buildFillProfile(): Promise<FillProfileReply> {
  const storedProfiles = await getStorage<unknown>(STORAGE_KEYS.PROFILES, []);
  const parsedProfile = profileSchema.safeParse(Array.isArray(storedProfiles) ? storedProfiles[0] : undefined);
  if (!parsedProfile.success) return { success: false, fields: {}, error: EMPTY_PROFILE_MESSAGE };
  const profile = parsedProfile.data;

  const fields: Record<string, { value: string }> = Object.fromEntries(
    Object.entries(profile.fields)
      .filter(([, field]) => field.value.trim())
      .map(([fieldName, field]) => [fieldName, { value: field.value }]),
  );
  for (const [fieldName, derivedValue] of Object.entries(derivedFields(profile))) {
    if (derivedValue && !fields[fieldName]) fields[fieldName] = { value: derivedValue };
  }
  if (!fields.email?.value && !fields.name?.value && !fields.firstName?.value) {
    return { success: false, fields: {}, error: EMPTY_PROFILE_MESSAGE };
  }

  const links = [fields.linkedin?.value, fields.github?.value, fields.portfolio?.value];
  const history = {
    experience: profile.workExperience as Array<Record<string, unknown>>,
    education: profile.education as Array<Record<string, unknown>>,
    links: links.filter((link): link is string => Boolean(link)),
    skills: profile.skills,
  };
  return { success: true, fields, resume: profile.resume, history };
}
