/** A saved profile, as read back from storage. Extra keys are kept for forward compatibility. */
import { z } from 'zod';

export const profileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    isDefault: z.boolean().optional(),
    resume: z
      .object({
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        uploadDate: z.string(),
        base64: z.string().optional(),
        plainText: z.string().optional(),
        links: z.array(z.string()).optional(),
      })
      .optional(),
    fields: z.record(
      z.object({
        value: z.string(),
        source: z.enum(['manual', 'resume', 'ai', 'import']).optional(),
        confirmed: z.boolean().optional(),
      }),
    ),
    skills: z.array(z.string()),
    certifications: z.array(z.string()),
    languages: z.array(z.string()),
    workExperience: z.array(z.unknown()),
    education: z.array(z.unknown()),
    projects: z.array(z.unknown()),
    manualLists: z.record(z.boolean()).optional(),
  })
  .passthrough();
