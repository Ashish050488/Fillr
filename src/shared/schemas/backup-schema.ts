/** Backup files you export and import (never containing API keys). */
import { z } from 'zod';
import type { BackupData } from '../types';
import { jobSchema, metricsSchema } from './job-schemas';
import { profileSchema } from './profile-schema';

export const backupSchema = z
  .object({
    version: z.number().optional(),
    exportedAt: z.string().optional(),
    profiles: z.array(profileSchema).optional(),
    activeProfileId: z.string().optional(),
    jobs: z.array(jobSchema).optional(),
    metrics: metricsSchema.optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .passthrough();
export function parseBackup(input: unknown): BackupData {
  // Accept exports from both the flat legacy format and wrappers used by file pickers.
  const candidate = Array.isArray(input)
    ? { jobs: input }
    : input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
  return backupSchema.parse(candidate) as BackupData;
}
