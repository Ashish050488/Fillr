import { extractLinks, properName, totalExperienceYears } from '../../shared/resume/resume-facts';
import { derivedFields } from '../../shared/resume/derived-profile-fields';
import type { Profile, ResumeFacts } from '../../shared/types';

/** Re-parsing is additive. A hand-edited blank is an intentional choice, too. */
export function mergeResumeFacts(profile: Profile, facts: ResumeFacts): Profile {
  const ownership = profile.manualLists ?? {};
  const fields = { ...profile.fields };
  const values: Record<string, string | undefined> = {
    name: facts.name?.full || [facts.name?.first, facts.name?.middle, facts.name?.last].filter(Boolean).join(' '),
    firstName: facts.name?.first,
    middleName: facts.name?.middle,
    lastName: facts.name?.last,
    email: facts.email,
    phone: facts.phone,
    location: facts.city,
    country: facts.country,
    linkedin: facts.linkedin,
    github: facts.github,
    portfolio: facts.portfolio,
    headline: facts.headline,
    currentCompany: facts.currentCompany,
    yearsExperience: facts.yearsExperience === undefined ? undefined : String(facts.yearsExperience),
    summary: facts.summary,
  };
  // Models miss hyperlinks and miscount years; prefer what the PDF and the dates actually say.
  const found = extractLinks(profile.resume?.plainText ?? '', profile.resume?.links ?? []);
  values.linkedin = values.linkedin?.includes('linkedin.com') ? values.linkedin : (found.linkedin ?? values.linkedin);
  values.github = values.github?.includes('github.com') ? values.github : (found.github ?? values.github);
  values.portfolio = values.portfolio || found.portfolio;
  values.email = values.email || found.email;
  values.phone = values.phone || found.phone;
  const years = totalExperienceYears(facts.experience ?? []);
  if (years !== undefined) values.yearsExperience = String(years);
  // Resumes often print the name in capitals; forms (Workday especially) want "Ashish Ranjan".
  for (const key of ['name', 'firstName', 'middleName', 'lastName'] as const)
    if (values[key]) values[key] = properName(values[key]!);
  if (!values.firstName && values.name) [values.firstName] = values.name.split(/\s+/);
  if (!values.lastName && values.name && values.name.trim().includes(' '))
    values.lastName = values.name.trim().split(/\s+/).slice(-1)[0];
  for (const [key, value] of Object.entries(values)) {
    // Your own edits always win; values an earlier parse guessed may be corrected by a newer one.
    if (
      !value?.trim() ||
      fields[key]?.source === 'manual' ||
      (fields[key]?.value?.trim() && fields[key]?.source !== 'ai')
    )
      continue;
    fields[key] = { value: value.trim(), source: 'ai', confirmed: false };
  }
  const education = profile.education.length ? profile.education : (facts.education ?? []);
  const workExperience = profile.workExperience.length ? profile.workExperience : (facts.experience ?? []);
  for (const [key, value] of Object.entries(derivedFields({ workExperience, education }))) {
    if (value && !fields[key]?.value?.trim() && fields[key]?.source !== 'manual')
      fields[key] = { value, source: 'ai', confirmed: false };
  }
  return {
    ...profile,
    fields,
    skills: ownership.skills || profile.skills.length ? profile.skills : (facts.skills ?? []),
    certifications:
      ownership.certifications || profile.certifications.length ? profile.certifications : (facts.certifications ?? []),
    languages: ownership.languages || profile.languages.length ? profile.languages : (facts.languages ?? []),
    education: profile.education.length ? profile.education : (facts.education ?? []),
    workExperience: profile.workExperience.length ? profile.workExperience : (facts.experience ?? []),
    projects: profile.projects.length ? profile.projects : (facts.projects ?? []),
    manualLists: ownership,
  };
}
