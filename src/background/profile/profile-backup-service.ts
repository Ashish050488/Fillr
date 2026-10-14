/**
 * Your parsed profile survives reinstalling the extension: it is mirrored to chrome.storage.sync
 * (in ~7 KB chunks, under the 8 KB-per-item limit) and restored when local storage is empty.
 * The PDF itself is too large for sync, so after a reinstall only the file needs re-uploading,
 * not re-parsing. API keys are never copied.
 */
import { STORAGE_KEYS } from '../../shared/storage/extension-storage';

const PREFIX = 'jobfill_profile_backup_';
const CHUNK = 7000;
const MAX_CHUNKS = 12;
let timer: ReturnType<typeof setTimeout> | undefined;

interface Backup {
  savedAt: number;
  profiles: unknown[];
}

function slimProfilesForBackup(profiles: unknown[]): unknown[] {
  return profiles.map((storedProfile) => {
    const profile = storedProfile as { resume?: Record<string, unknown> };
    if (!profile.resume) return profile;
    // Keep the resume's name and text (for AI) but not the PDF bytes.
    const resume = { ...profile.resume };
    delete resume.base64;
    return {
      ...profile,
      resume: { ...resume, plainText: String(resume.plainText ?? '').slice(0, 20000), backupOnly: true },
    };
  });
}

async function write(profiles: unknown[]): Promise<void> {
  const text = JSON.stringify({ savedAt: Date.now(), profiles: slimProfilesForBackup(profiles) } satisfies Backup);
  const chunks = Math.ceil(text.length / CHUNK);
  if (chunks > MAX_CHUNKS) return; // Unusually large profile: skip rather than fail sync.
  const values: Record<string, string | number> = { [`${PREFIX}count`]: chunks };
  for (let index = 0; index < chunks; index += 1)
    values[`${PREFIX}${index}`] = text.slice(index * CHUNK, (index + 1) * CHUNK);
  await chrome.storage.sync.set(values);
}

async function read(): Promise<Backup | undefined> {
  const count = Number((await chrome.storage.sync.get(`${PREFIX}count`))[`${PREFIX}count`] ?? 0);
  if (!count) return undefined;
  const keys = Array.from({ length: count }, (_, index) => `${PREFIX}${index}`);
  const parts = await chrome.storage.sync.get(keys);
  try {
    return JSON.parse(keys.map((key) => String(parts[key] ?? '')).join('')) as Backup;
  } catch {
    return undefined;
  }
}

/** Restore after a reinstall, then keep the mirror current (debounced: sync allows few writes a minute). */
export async function startProfileBackup(): Promise<void> {
  if (!chrome.storage?.sync) return;
  try {
    const local = (await chrome.storage.local.get(STORAGE_KEYS.PROFILES))[STORAGE_KEYS.PROFILES];
    if (!Array.isArray(local) || !local.length) {
      const backup = await read();
      if (backup?.profiles.length) await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: backup.profiles });
    }
  } catch {
    /* Sync unavailable (signed out, policy): local storage still works. */
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.PROFILES in changes)) return;
    const profiles = changes[STORAGE_KEYS.PROFILES].newValue;
    if (!Array.isArray(profiles) || !profiles.length) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void write(profiles).catch(() => undefined);
    }, 4000);
  });
}
