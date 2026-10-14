import type { AIConfig, AIKeyConfig, AITask } from '../../../shared/types';
import { keyIdentity, readKeyState, updateKeyState } from '../keys/key-health-store';
import { rotateKeys } from '../keys/key-rotation';
import { cachedModelCatalog } from '../models/model-catalog-cache';
import { taskModels } from '../models/model-selection';
import { ProviderError } from '../providers/provider-client';
import type { AttemptLog } from './attempt-log';
import { takeNextModelTurn } from './model-turn';

const MAXIMUM_KEYS_PER_TASK = 6;

export interface PlannedAttempt {
  key: AIKeyConfig;
  model: string;
}

/** Only a key Google rejects is benched; rate limits and server errors are per model. */
export async function benchRejectedKey(key: AIKeyConfig, error: unknown): Promise<void> {
  if (error instanceof ProviderError && error.kind === 'invalid') {
    await updateKeyState(keyIdentity(key.provider, key.key), { invalid: true });
  }
}

async function usableKeys(configuration: AIConfig, task: AITask): Promise<AIKeyConfig[]> {
  const keyHealth = await readKeyState();
  const healthyKeys = (configuration.keys ?? []).filter((key) => {
    const health = keyHealth[keyIdentity(key.provider, key.key)];
    return key.enabled !== false && key.key.trim() && !health?.invalid;
  });
  if (!healthyKeys.length) {
    throw new Error(
      (configuration.keys ?? []).length
        ? 'Google rejected your saved API key. Open Settings, remove it and add a new key from Google AI Studio.'
        : 'Add a free Gemini API key in Settings first.',
    );
  }
  const rotatedKeys = (await rotateKeys(healthyKeys, task)).slice(0, MAXIMUM_KEYS_PER_TASK);
  if (!rotatedKeys.length) {
    throw new Error(
      'These free-tier routes need a Gemini key or a verified-free OpenRouter model. No paid provider was used.',
    );
  }
  return rotatedKeys;
}

/**
 * Every key and model worth trying, in order. Model-major (as in jobmesh's cascade): the best
 * model is tried on every key before falling back to a weaker one, since free-tier quotas are
 * per key and per model.
 */
export async function buildAttemptPlan(
  configuration: AIConfig,
  task: AITask,
  requestedModel: string | undefined,
  attemptLog: AttemptLog,
): Promise<PlannedAttempt[]> {
  const turn = await takeNextModelTurn(task);
  const modelsByKey: Array<{ key: AIKeyConfig; models: string[] }> = [];
  for (const key of await usableKeys(configuration, task)) {
    try {
      const catalog = await cachedModelCatalog(key.provider, key.key);
      const preferredModel = requestedModel ?? configuration.model?.[key.provider];
      const models = taskModels(catalog, task, key.provider, preferredModel, turn);
      if (models.length) modelsByKey.push({ key, models });
      else
        attemptLog.record(
          key.provider,
          new Error('No free Gemma or Gemini model is available on this key. Test it in Settings.'),
        );
    } catch (error) {
      attemptLog.record(key.provider, error);
      await benchRejectedKey(key, error);
    }
  }
  const deepestModelList = Math.max(0, ...modelsByKey.map((entry) => entry.models.length));
  const plannedAttempts: PlannedAttempt[] = [];
  for (let modelRank = 0; modelRank < deepestModelList; modelRank += 1) {
    for (const { key, models } of modelsByKey) {
      if (models[modelRank]) plannedAttempts.push({ key, model: models[modelRank] });
    }
  }
  return plannedAttempts;
}
