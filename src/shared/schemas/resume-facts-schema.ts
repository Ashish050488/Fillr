/** What AI may return when it reads a resume. Unknown keys are rejected. */
import { z } from 'zod';

const optionalText = z.string().trim().min(1).optional();
export const resumeFactsSchema = z
  .object({
    name: z.object({ first: optionalText, middle: optionalText, last: optionalText, full: optionalText }).optional(),
    email: optionalText,
    phone: optionalText,
    city: optionalText,
    country: optionalText,
    linkedin: optionalText,
    github: optionalText,
    portfolio: optionalText,
    headline: optionalText,
    currentCompany: optionalText,
    yearsExperience: z.number().finite().nonnegative().optional(),
    summary: optionalText,
    skills: z.array(z.string().trim().min(1)).optional(),
    education: z
      .array(
        z.object({
          institution: z.string(),
          degree: optionalText,
          field: optionalText,
          startDate: optionalText,
          endDate: optionalText,
          details: optionalText,
        }),
      )
      .optional(),
    experience: z
      .array(
        z.object({
          company: z.string(),
          title: optionalText,
          startDate: optionalText,
          endDate: optionalText,
          location: optionalText,
          description: optionalText,
        }),
      )
      .optional(),
    projects: z
      .array(
        z.object({
          name: z.string(),
          description: optionalText,
          url: optionalText,
          technologies: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    certifications: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  })
  .strict();
