import { z } from 'zod';
import { getStorage, setStorage, STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { AIConfig, AIKeyConfig, AIProvider } from '../../../shared/types';
import { clearModelUnavailable } from '../models/model-availability-store';
import { cachedModelCatalog } from '../models/model-catalog-cache';
import { ProviderError } from '../providers/provider-client';
import { clearKeyState, keyIdentity, readKeyState, updateKeyState } from './key-health-store';

const aiConfigurationSchema = z
  .object({
    keys: z
      .array(
        z.object({
          provider: z.enum(['gemini', 'openrouter', 'groq']),
          key: z.string(),
          enabled: z.boolean().optional(),
        }),
      )
      .optional(),
    model: z.record(z.string()).optional(),
  })
  .passthrough();

export async function readAiConfiguration(): Promise<AIConfig> {
  return aiConfigurationSchema.parse(await getStorage<unknown>(STORAGE_KEYS.AI_CONFIG, {}));
}

let pendingKeyOperations: Promise<void> = Promise.resolve();

/** Key changes run one at a time so two saves never overwrite each other. */
function withKeyLock<Outcome>(operation: () => Promise<Outcome>): Promise<Outcome> {
  const queuedOperation = pendingKeyOperations.then(operation, operation);
  pendingKeyOperations = queuedOperation.then(
    () => undefined,
    () => undefined,
  );
  return queuedOperation;
}

/** Only a key Google rejects is marked invalid; rate limits and server errors are per model. */
async function rememberRejectedKey(key: AIKeyConfig, error: unknown): Promise<void> {
  if (error instanceof ProviderError && error.kind === 'invalid') {
    await updateKeyState(keyIdentity(key.provider, key.key), { invalid: true });
  }
}

const savedKeyId = (provider: AIProvider, keyIndex: number) => `${provider}-${keyIndex}`;

export function maskKey(key: string): string {
  return key.length < 8 ? '••••••••' : `${key.slice(0, 3)}••••${key.slice(-3)}`;
}

/** Saved keys, masked. The full key never leaves the background. */
export function getKeyInfo(): Promise<Array<{ id: string; provider: AIProvider; masked: string; enabled: boolean }>> {
  return withKeyLock(async () =>
    ((await readAiConfiguration()).keys ?? []).map((savedKey, keyIndex) => ({
      id: savedKeyId(savedKey.provider, keyIndex),
      provider: savedKey.provider,
      masked: maskKey(savedKey.key),
      enabled: savedKey.enabled !== false,
    })),
  );
}

/** Saved only after the key lists at least one model. Re-adding a key just clears its old errors. */
export function saveKey(provider: AIProvider, rawKey: string): Promise<{ id: string; masked: string }> {
  const key = rawKey.trim();
  return withKeyLock(async () => {
    const models = await cachedModelCatalog(provider, key, { refresh: true }).catch(async (error: unknown) => {
      await rememberRejectedKey({ provider, key }, error);
      throw error;
    });
    if (!models.length) throw new Error('No models discovered for this key');
    const configuration = await readAiConfiguration();
    const savedKeys = configuration.keys ?? [];
    const existingIndex = savedKeys.findIndex((savedKey) => savedKey.provider === provider && savedKey.key === key);
    const keyIndex = existingIndex >= 0 ? existingIndex : savedKeys.length;
    if (existingIndex < 0) {
      await setStorage({
        [STORAGE_KEYS.AI_CONFIG]: { ...configuration, keys: [...savedKeys, { provider, key, enabled: true }] },
      });
    }
    await clearKeyState(keyIdentity(provider, key));
    await clearModelUnavailable(provider, key);
    return { id: savedKeyId(provider, keyIndex), masked: maskKey(key) };
  });
}

export function removeKey(keyId: string): Promise<void> {
  return withKeyLock(async () => {
    const configuration = await readAiConfiguration();
    const savedKeys = configuration.keys ?? [];
    const removedIndex = savedKeys.findIndex((savedKey, keyIndex) => savedKeyId(savedKey.provider, keyIndex) === keyId);
    if (removedIndex < 0) throw new Error('Saved key not found');
    const remainingKeys = savedKeys.filter((_, keyIndex) => keyIndex !== removedIndex);
    await setStorage({ [STORAGE_KEYS.AI_CONFIG]: { ...configuration, keys: remainingKeys } });
  });
}

/** List a key's models afresh; success also clears any old error state for it. */
async function listModelsForKey(provider: AIProvider, key: string): Promise<string[]> {
  try {
    const models = await cachedModelCatalog(provider, key, { refresh: true });
    if (!models.length) throw new Error('No models discovered for this key');
    await clearKeyState(keyIdentity(provider, key));
    await clearModelUnavailable(provider, key);
    return models.map((model) => model.id);
  } catch (error) {
    await rememberRejectedKey({ provider, key }, error);
    throw error;
  }
}

export function testSavedKey(keyId: string): Promise<string[]> {
  return withKeyLock(async () => {
    const savedKeys = (await readAiConfiguration()).keys ?? [];
    const savedKey = savedKeys.find((candidate, keyIndex) => savedKeyId(candidate.provider, keyIndex) === keyId);
    if (!savedKey) throw new Error('Saved key not found');
    return listModelsForKey(savedKey.provider, savedKey.key);
  });
}

export function testKey(provider: AIProvider, key: string): Promise<string[]> {
  return withKeyLock(() => listModelsForKey(provider, key));
}

/** Fresh model lists for every usable key (or just one), grouped by provider. */
export function loadModels(onlyKey?: AIKeyConfig): Promise<Partial<Record<AIProvider, string[]>>> {
  return withKeyLock(async () => {
    const keys = onlyKey ? [onlyKey] : ((await readAiConfiguration()).keys ?? []);
    const keyHealth = await readKeyState();
    const modelsByProvider: Partial<Record<AIProvider, string[]>> = {};
    for (const key of keys) {
      if (key.enabled === false || !key.key || keyHealth[keyIdentity(key.provider, key.key)]?.invalid) continue;
      try {
        const catalog = await cachedModelCatalog(key.provider, key.key, { refresh: true });
        modelsByProvider[key.provider] = catalog.map((model) => model.id);
        await clearModelUnavailable(key.provider, key.key);
      } catch (error) {
        await rememberRejectedKey(key, error);
        throw error;
      }
    }
    return modelsByProvider;
  });
}
