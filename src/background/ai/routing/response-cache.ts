/**
 * Persistent LRU of validated AI replies keyed by a hash of the exact prompt (jobmesh's
 * response cache, kept in chrome.storage). Re-checking the same job with the same profile,
 * or re-parsing an unchanged resume, costs no quota.
 */
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';
import type { AIProvider } from '../../../shared/types';

const RESPONSE_CACHE_STORAGE_KEY = 'jobfill_ai_response_cache_v1';
const MAXIMUM_CACHED_RESPONSES = 80;
const RESPONSE_LIFETIME_MILLISECONDS = 14 * 86_400_000;

interface CachedResponse {
  value: unknown;
  provider: AIProvider;
  model: string;
}
type ResponseCacheStore = Record<string, CachedResponse & { at: number }>;

export async function responseCacheId(task: string, prompt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${task}\n${prompt}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readResponseCache(cacheId: string): Promise<CachedResponse | undefined> {
  const cachedResponse = (await getStorage<ResponseCacheStore>(RESPONSE_CACHE_STORAGE_KEY, {}))[cacheId];
  const isFresh = !!cachedResponse && Date.now() - cachedResponse.at < RESPONSE_LIFETIME_MILLISECONDS;
  return isFresh ? cachedResponse : undefined;
}

export async function writeResponseCache(cacheId: string, response: CachedResponse): Promise<void> {
  const responseStore = await getStorage<ResponseCacheStore>(RESPONSE_CACHE_STORAGE_KEY, {});
  const newestOtherResponses = Object.entries(responseStore)
    .filter(([storedId]) => storedId !== cacheId)
    .sort(([, first], [, second]) => second.at - first.at)
    .slice(0, MAXIMUM_CACHED_RESPONSES - 1);
  await setStorage({
    [RESPONSE_CACHE_STORAGE_KEY]: Object.fromEntries([
      [cacheId, { ...response, at: Date.now() }],
      ...newestOtherResponses,
    ]),
  });
}
