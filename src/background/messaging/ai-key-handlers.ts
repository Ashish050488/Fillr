import { aiSaveKeySchema, aiTaskRequestSchema, aiTestKeySchema } from '../../shared/schemas';
import { getKeyInfo, loadModels, removeKey, runTask, saveKey, testKey, testSavedKey } from '../ai/ai-engine';
import { usageToday } from '../ai/routing/model-usage-tracker';
import { describeError, isExtensionPage, type RegisterMessageHandler } from './message-registrar';

const KEYS_ARE_PRIVATE = 'API key operations are only available to extension pages.';

/** Saving, testing and listing API keys, and running AI tasks. Keys never leave the background. */
export function registerAiKeyHandlers(handle: RegisterMessageHandler): void {
  handle('AI_TEST_KEY', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: KEYS_ARE_PRIVATE };
    const parsedRequest = aiTestKeySchema.safeParse(payload);
    if (!parsedRequest.success) return { success: false, error: 'Invalid API key request' };
    const { id, provider, key } = parsedRequest.data;
    try {
      return { success: true, models: id ? await testSavedKey(id) : await testKey(provider!, key!.trim()) };
    } catch (error) {
      return { success: false, error: describeError(error, key) };
    }
  });

  handle('AI_KEY_INFO', async (_payload, sender) => {
    if (!isExtensionPage(sender)) {
      return { success: false, keys: [], error: 'API key information is not available to content scripts.' };
    }
    return { success: true, keys: await getKeyInfo() };
  });

  handle('AI_SAVE_KEY', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: KEYS_ARE_PRIVATE };
    const parsedRequest = aiSaveKeySchema.safeParse(payload);
    if (!parsedRequest.success || !parsedRequest.data.key.trim())
      return { success: false, error: 'API key is required' };
    const key = parsedRequest.data.key.trim();
    try {
      return { success: true, ...(await saveKey(parsedRequest.data.provider, key)) };
    } catch (error) {
      return { success: false, error: describeError(error, key) };
    }
  });

  handle('AI_REMOVE_KEY', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: KEYS_ARE_PRIVATE };
    try {
      await removeKey(String(payload?.id ?? ''));
      return { success: true };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  });

  handle('AI_LOAD_MODELS', async (_payload, sender) => {
    if (!isExtensionPage(sender)) {
      return { success: false, models: {}, error: 'Model lists are not available to content scripts.' };
    }
    return { success: true, models: await loadModels() };
  });

  handle('AI_USAGE', async () => ({ success: true, rows: await usageToday() }));

  handle('AI_TASK', async (payload) => {
    const parsedRequest = aiTaskRequestSchema.safeParse(payload);
    if (!parsedRequest.success) {
      return {
        success: false,
        error: 'Invalid AI task. Provide the required resume text and, for writing, a job description.',
      };
    }
    try {
      const { task, context, model } = parsedRequest.data;
      return { success: true, ...(await runTask(task, context, model)) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'AI task failed') };
    }
  });

  // Page scripts may run AI tasks, but a payload that carries a key is always refused.
  handle('CONTENT_MESSAGE', async ({ type, payload }) => {
    if (payload && typeof payload === 'object' && 'key' in payload) {
      return { success: false, error: 'API keys are only available to the extension background.' };
    }
    const parsedTask = aiTaskRequestSchema.safeParse(payload);
    if (type !== 'AI_TASK' || !parsedTask.success) return { success: false, error: `Unknown content message: ${type}` };
    try {
      return { success: true, data: await runTask(parsedTask.data.task, parsedTask.data.context) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'AI task failed') };
    }
  });
}
