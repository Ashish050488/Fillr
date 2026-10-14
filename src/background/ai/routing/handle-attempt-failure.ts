import type { AIKeyConfig } from '../../../shared/types';
import { markUnavailable } from '../models/model-availability-store';
import { ProviderError } from '../providers/provider-client';
import { isDailyQuota, markExhausted, recordFailure } from './model-usage-tracker';

const MINIMUM_RATE_LIMIT_PAUSE_MILLISECONDS = 60_000;
const BUSY_MODEL_PAUSE_MILLISECONDS = 90_000;

/** What the router should do next after a failed call. */
export type FailureOutcome = 'key-rejected' | 'model-paused' | 'temporarily-busy' | 'try-next';

/**
 * Remember why a call failed so the next requests avoid it:
 * - rejected key: skip the key everywhere;
 * - 404: the model is gone for this key;
 * - 429: daily quota used up (until Google's Pacific-time reset) or a brief per-minute pause;
 * - 500/503/timeout: temporary, so rest the model briefly and move straight to the next one.
 */
export async function handleAttemptFailure(
  key: AIKeyConfig,
  keyId: string,
  model: string,
  error: unknown,
): Promise<FailureOutcome> {
  if (!(error instanceof ProviderError)) return 'try-next';
  if (error.kind === 'invalid') return 'key-rejected';
  if (error.status === 404) {
    await markUnavailable(key.provider, key.key, model);
    return 'model-paused';
  }
  if (error.status === 429) {
    if (error.quotaZero || isDailyQuota(error.message)) await markExhausted(keyId, model);
    else {
      const pauseMilliseconds = Math.max(MINIMUM_RATE_LIMIT_PAUSE_MILLISECONDS, error.retryAfterMs ?? 0);
      await markUnavailable(key.provider, key.key, model, pauseMilliseconds);
    }
    return 'model-paused';
  }
  if (error.status === undefined || error.status >= 500) {
    await recordFailure(keyId, model);
    await markUnavailable(key.provider, key.key, model, BUSY_MODEL_PAUSE_MILLISECONDS);
    return 'temporarily-busy';
  }
  return 'try-next';
}
