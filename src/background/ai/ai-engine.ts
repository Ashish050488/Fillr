import type { AIProvider, AITaskResult } from '../../shared/types';
import { readAiConfiguration } from './keys/ai-key-service';
import { routeTask } from './routing/route-ai-task';

export { getKeyInfo, loadModels, maskKey, removeKey, saveKey, testKey, testSavedKey } from './keys/ai-key-service';

const KEEP_ALIVE_INTERVAL_MILLISECONDS = 20_000;

/**
 * Run one AI task. Not queued behind other tasks: one slow resume parse must never stall an
 * autofill. Chrome may stop an idle extension service worker after ~30 s even mid-request, so an
 * extension API call every 20 s marks it busy until the task settles.
 */
export async function runTask(
  task: string,
  context?: unknown,
  requestedModel?: string,
): Promise<{ result: AITaskResult; provider: AIProvider; model: string }> {
  const keepAlive = setInterval(() => {
    void chrome.runtime.getPlatformInfo?.().catch(() => undefined);
  }, KEEP_ALIVE_INTERVAL_MILLISECONDS);
  try {
    return await routeTask(await readAiConfiguration(), { task, context, model: requestedModel });
  } finally {
    clearInterval(keepAlive);
  }
}
