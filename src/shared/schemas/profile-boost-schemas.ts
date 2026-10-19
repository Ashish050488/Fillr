import { z } from 'zod';

const MAXIMUM_PROFILE_FIELDS = 30;

/** A profile page as the content script read it; the page is untrusted, so every size is capped. */
export const profilePageScanSchema = z
  .object({
    url: z.string().url().max(2000),
    site: z.string().trim().min(1).max(60),
    pageText: z.string().max(20000),
    fields: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(40),
            label: z.string().max(400),
            section: z.string().max(120).optional(),
            context: z.string().max(200).optional(),
            value: z.string().max(5000),
            maxLength: z.number().int().positive().max(20000).optional(),
            kind: z.enum(['text', 'skills']),
          })
          .strict(),
      )
      .max(MAXIMUM_PROFILE_FIELDS),
  })
  .strict();

export const profileBoostRequestSchema = z
  .object({
    scan: profilePageScanSchema,
    refresh: z.boolean().optional(),
    cachedOnly: z.boolean().optional(),
  })
  .strict();
