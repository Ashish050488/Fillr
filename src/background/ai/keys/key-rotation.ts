import { z } from 'zod';
import type { AIKeyConfig, AITask } from '../../../shared/types';
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';

const ROTATION_STORAGE_KEY = 'jobfill_ai_rotation_v1';
const rotationCursorSchema = z.record(z.number().int().nonnegative());

/** Orders keys so each task starts on the next key of every provider (round robin). */
export async function rotateKeys(keys: AIKeyConfig[], task: AITask): Promise<AIKeyConfig[]> {
  const parsedCursors = rotationCursorSchema.safeParse(await getStorage<unknown>(ROTATION_STORAGE_KEY, {}));
  const cursorsByProviderTask = parsedCursors.success ? parsedCursors.data : {};
  const rotatedKeys: AIKeyConfig[] = [];
  const seenIdentities = new Set<string>();
  // Unknown-cost providers are not used automatically by these free-only routes.
  for (const provider of ['gemini', 'openrouter'] as const) {
    const providerKeys = keys.filter((candidate) => {
      const identity = JSON.stringify([candidate.provider, candidate.key]);
      if (candidate.provider !== provider || seenIdentities.has(identity)) return false;
      seenIdentities.add(identity);
      return true;
    });
    if (!providerKeys.length) continue;
    const cursorKey = `${provider}:${task}`;
    const startIndex = (cursorsByProviderTask[cursorKey] ?? 0) % providerKeys.length;
    rotatedKeys.push(...providerKeys.slice(startIndex), ...providerKeys.slice(0, startIndex));
    cursorsByProviderTask[cursorKey] = (startIndex + 1) % providerKeys.length;
  }
  await setStorage({ [ROTATION_STORAGE_KEY]: cursorsByProviderTask });
  return rotatedKeys;
}
