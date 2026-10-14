import { z } from 'zod';
import { profileSchema } from '../../shared/schemas';
import { getStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import { properName } from '../../shared/resume/resume-facts';
import type { Profile } from '../../shared/types';

// Contact details are filled straight from the profile and never needed by the writer.
const FIELDS_NOT_FOR_AI = new Set([
  'email',
  'phone',
  'phoneCountryCode',
  'firstName',
  'middleName',
  'lastName',
  'linkedin',
  'github',
  'country',
]);
const MAXIMUM_RESUME_TEXT_LENGTH = 30000;

function trimText(text: unknown, maximumLength: number): unknown {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, maximumLength) : text;
}

/** The first few entries of a resume list, without empty fields and with long text cut short. */
function trimEntries(entries: unknown[], maximumEntries: number, maximumTextLength: number): unknown[] {
  return entries.slice(0, maximumEntries).map((entry) =>
    Object.fromEntries(
      Object.entries(entry as Record<string, unknown>)
        .filter(
          ([, fieldValue]) =>
            fieldValue !== undefined && fieldValue !== '' && !(Array.isArray(fieldValue) && !fieldValue.length),
        )
        .map(([fieldName, fieldValue]) => [
          fieldName,
          Array.isArray(fieldValue) ? fieldValue.slice(0, 12) : trimText(fieldValue, maximumTextLength),
        ]),
    ),
  );
}

/** Only what the writer needs, trimmed: fewer tokens per call, same answers. */
export function buildCandidateDigest(profile: Profile): Record<string, unknown> {
  const candidateDigest: Record<string, unknown> = Object.fromEntries(
    Object.entries(profile.fields)
      .filter(([fieldName, field]) => field.value.trim() && !FIELDS_NOT_FOR_AI.has(fieldName))
      .map(([fieldName, field]) => [
        fieldName,
        fieldName === 'name' || fieldName === 'preferredName' ? properName(field.value) : trimText(field.value, 800),
      ]),
  );
  if (profile.skills.length) candidateDigest.skills = profile.skills.slice(0, 60);
  if (profile.workExperience.length) candidateDigest.experience = trimEntries(profile.workExperience, 8, 600);
  if (profile.education.length) candidateDigest.education = trimEntries(profile.education, 4, 200);
  if (profile.projects.length) candidateDigest.projects = trimEntries(profile.projects, 5, 300);
  if (profile.certifications.length) candidateDigest.certifications = profile.certifications.slice(0, 10);
  if (profile.languages.length) candidateDigest.languages = profile.languages;
  return candidateDigest;
}

export interface WriterInput {
  candidate: Record<string, unknown>;
  resumeText?: string;
}

/**
 * The candidate side of every writing prompt. Refuses an empty profile before any AI call;
 * the raw resume text is only included when parsing left the profile thin.
 */
export async function loadWriterInput(): Promise<WriterInput> {
  const parsedProfiles = z.array(profileSchema).safeParse(await getStorage<unknown>(STORAGE_KEYS.PROFILES, []));
  const profile = parsedProfiles.success ? (parsedProfiles.data[0] as Profile | undefined) : undefined;
  const hasIdentity = Boolean(
    profile?.fields.email?.value?.trim() ||
      profile?.fields.name?.value?.trim() ||
      profile?.fields.firstName?.value?.trim(),
  );
  if (!profile || (!hasIdentity && !profile.resume)) {
    throw new Error(
      'Your JobFill profile is empty. Open the JobFill panel and add your resume first. Nothing was filled.',
    );
  }
  const hasStructuredHistory = profile.workExperience.length > 0 || profile.skills.length > 0;
  const resumeText = profile.resume?.plainText?.trim();
  if (!hasStructuredHistory && !resumeText)
    throw new Error('Upload your resume in the JobFill panel so AI can write for you.');
  return {
    candidate: buildCandidateDigest(profile),
    ...(!hasStructuredHistory && resumeText ? { resumeText: resumeText.slice(0, MAXIMUM_RESUME_TEXT_LENGTH) } : {}),
  };
}
