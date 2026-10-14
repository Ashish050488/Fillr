import type { Profile } from '../../shared/types';

export function emptyProfile(): Profile {
  return {
    id: crypto.randomUUID(),
    name: 'My profile',
    isDefault: true,
    fields: {},
    skills: [],
    certifications: [],
    languages: [],
    workExperience: [],
    education: [],
    projects: [],
  };
}
