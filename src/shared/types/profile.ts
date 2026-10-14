/** Your profile and the facts AI reads from a resume. */
export type FieldSource = 'manual' | 'resume' | 'ai' | 'import';
export interface ProfileField {
  value: string;
  source?: FieldSource;
  confirmed?: boolean;
}
export interface ResumePersonName {
  first?: string;
  middle?: string;
  last?: string;
  full?: string;
}
export interface ResumeEducation {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
}
export interface ResumeExperience {
  company: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
}
export interface ResumeProject {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
}
export interface ResumeFacts {
  name?: ResumePersonName;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  headline?: string;
  currentCompany?: string;
  yearsExperience?: number;
  summary?: string;
  skills?: string[];
  education?: ResumeEducation[];
  experience?: ResumeExperience[];
  projects?: ResumeProject[];
  certifications?: string[];
  languages?: string[];
}
export interface Resume {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  base64?: string;
  plainText?: string;
  links?: string[];
}
export interface Profile {
  id: string;
  name: string;
  isDefault?: boolean;
  resume?: Resume;
  fields: Record<string, ProfileField>;
  skills: string[];
  certifications: string[];
  languages: string[];
  workExperience: unknown[];
  education: unknown[];
  projects: unknown[];
  manualLists?: Record<string, boolean>;
}
