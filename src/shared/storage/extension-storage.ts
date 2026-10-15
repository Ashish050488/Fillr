import type { BackupData } from '../types';
import { parseBackup } from '../schemas';

export const STORAGE_KEYS = {
  PROFILES: 'jobfill_profiles',
  USER_PROFILES: 'jobfill_profiles',
  ACTIVE_PROFILE_ID: 'jobfill_active_profile_id',
  JOBS: 'jobfill_jobs_v1',
  JOBS_STORAGE: 'jobfill_jobs_v1',
  METRICS: 'jobfill_lifetime_metrics_v1',
  LIFETIME_METRICS: 'jobfill_lifetime_metrics_v1',
  SETTINGS: 'jobfill_settings',
  AI_CONFIG: 'jobfill_ai_config',
  APPLICATION_HISTORY: 'jobfill_application_history',
  DATA_VERSION: 'jobfill_data_version',
  REFERRALS: 'jobfill_referrals_v1',
} as const;
type Stored = Record<string, unknown>;
function storage(): chrome.storage.StorageArea {
  return chrome.storage.local;
}
export async function getStorage<Value>(key: string, fallback: Value): Promise<Value> {
  const storedValues = await storage().get(key);
  return (storedValues[key] as Value | undefined) ?? fallback;
}
export async function setStorage(values: Stored): Promise<void> {
  await storage().set(values);
}
export async function removeStorage(keys: string | string[]): Promise<void> {
  await storage().remove(keys);
}
export async function exportBackup(): Promise<BackupData> {
  // Request only public backup domains: never read or export API keys/key health.
  const backupValues = await storage().get([
    STORAGE_KEYS.PROFILES,
    STORAGE_KEYS.ACTIVE_PROFILE_ID,
    STORAGE_KEYS.JOBS,
    STORAGE_KEYS.METRICS,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.DATA_VERSION,
  ]);
  return { ...backupValues, exportedAt: new Date().toISOString() } as BackupData;
}
export async function importBackup(input: unknown): Promise<BackupData> {
  const backup = parseBackup(input);
  await storage().set(backup as Stored);
  return backup;
}
