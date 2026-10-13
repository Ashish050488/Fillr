/** Storage compatibility constants copied from legacy shared/utils.js. */
export const STORAGE_KEYS = {
  USER_PROFILES: 'jobfill_profiles',
  ACTIVE_PROFILE_ID: 'jobfill_active_profile_id',
  AI_CONFIG: 'jobfill_ai_config',
  KEY_USAGE_LOGS: 'jobfill_key_usage_logs',
  SETTINGS: 'jobfill_settings',
  STATS: 'jobfill_stats', // legacy mirror
  ONBOARDING_COMPLETED: 'jobfill_onboarding_completed',
  APPLICATION_HISTORY: 'jobfill_application_history', // legacy mirror
  JOB_DESC_CACHE: 'jobfill_job_desc_cache',

  // Part 5 Isolated & Versioned Storage
  DATA_VERSION: 'jobfill_data_version',
  JOBS_STORAGE: 'jobfill_jobs_v1',
  LIFETIME_METRICS: 'jobfill_lifetime_metrics_v1',
  SYNC_BACKUP: 'jobfill_sync_backup_v1',
  LAST_BACKUP_REMINDER: 'jobfill_last_backup_reminder',
  ROUND_ROBIN_STATE: 'jobfill_round_robin_state'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
