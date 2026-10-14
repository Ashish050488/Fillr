import { z } from 'zod';
import type { AIProvider } from '../../../shared/types';
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';
import { discoverModelCatalog, type ModelInfo } from '../providers/provider-client';

const MODEL_CATALOG_STORAGE_KEY = 'jobfill_ai_model_catalog_v1';
const CATALOG_LIFETIME_MILLISECONDS = 86_400_000;

const catalogEntrySchema = z.object({
  at: z.number().finite(),
  models: z.array(z.object({ id: z.string(), displayName: z.string().optional(), free: z.boolean().optional() })),
});
const catalogStoreSchema = z.record(catalogEntrySchema);
const buildCatalogKey = (provider: AIProvider, key: string) => `${provider}:${key}`;

/** Cached adapter for production callers; the HTTP discovery functions remain storage-free. */
export async function cachedModelCatalog(
  provider: AIProvider,
  key: string,
  options: { refresh?: boolean } = {},
): Promise<ModelInfo[]> {
  const catalogKey = buildCatalogKey(provider, key);
  const parsedStore = catalogStoreSchema.safeParse(await getStorage<unknown>(MODEL_CATALOG_STORAGE_KEY, {}));
  const catalogsByKey = parsedStore.success ? parsedStore.data : {};
  const cachedCatalog = catalogsByKey[catalogKey];
  const isFresh =
    !!cachedCatalog && cachedCatalog.at <= Date.now() && Date.now() - cachedCatalog.at < CATALOG_LIFETIME_MILLISECONDS;
  if (!options.refresh && cachedCatalog && isFresh) return cachedCatalog.models;
  let models: ModelInfo[];
  try {
    models = await discoverModelCatalog(provider, key);
  } catch (error) {
    // A slow or failing model list must not block tasks: an older list is still a good list.
    if (cachedCatalog && !options.refresh) return cachedCatalog.models;
    throw error;
  }
  await setStorage({ [MODEL_CATALOG_STORAGE_KEY]: { ...catalogsByKey, [catalogKey]: { at: Date.now(), models } } });
  return models;
}
