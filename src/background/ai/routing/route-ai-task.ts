import { aiTaskRequestSchema } from '../../../shared/schemas';
import type { AIConfig, AIProvider, AITaskResult } from '../../../shared/types';
import { keyIdentity } from '../keys/key-health-store';
import { unavailable } from '../models/model-availability-store';
import { timeoutFor } from '../models/model-selection';
import { complete } from '../providers/provider-client';
import { taskPrompt, validateTaskResult } from '../tasks/task-prompts';
import { createAttemptLog } from './attempt-log';
import { benchRejectedKey, buildAttemptPlan, type PlannedAttempt } from './attempt-plan';
import { extractJsonReply } from './extract-json-reply';
import { handleAttemptFailure } from './handle-attempt-failure';
import { canUse, estimateTokens, recordRequest, recordSuccess } from './model-usage-tracker';
import { readResponseCache, responseCacheId, writeResponseCache } from './response-cache';

/** Enough for one pass over the models plus a short second try, still bounded. */
export const MAXIMUM_GENERATION_CALLS = 10;
const SECOND_TRY_COUNT = 2;
const SECOND_TRY_DELAY_MILLISECONDS = 2000;

export interface RoutedResult {
  result: AITaskResult;
  provider: AIProvider;
  model: string;
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Run one AI task on the free models: cached answer first, then each planned key and model once,
 * then a short second try of models that were only temporarily busy.
 */
export async function routeTask(configuration: AIConfig, input: unknown): Promise<RoutedResult> {
  const request = aiTaskRequestSchema.parse(input);
  const attemptLog = createAttemptLog(configuration.keys ?? []);
  const plannedAttempts = await buildAttemptPlan(configuration, request.task, request.model, attemptLog);
  const prompt = taskPrompt(request.task, request.context);
  const cacheId = await responseCacheId(request.task, prompt);
  const cachedReply = await readResponseCache(cacheId);
  if (cachedReply) {
    try {
      const result = validateTaskResult(request.task, request.context, cachedReply.value);
      return { result, provider: cachedReply.provider, model: cachedReply.model };
    } catch {
      // A stale cache entry from an older format: ask again.
    }
  }

  let callCount = 0;
  const callModel = async ({ key, model }: PlannedAttempt, promptText: string) => {
    if (callCount >= MAXIMUM_GENERATION_CALLS) throw new Error('Reached the request limit for this task.');
    callCount += 1; // Failed calls count too; the budget never resets on fallback.
    await recordRequest(keyIdentity(key.provider, key.key), model, estimateTokens(promptText));
    return complete(key.provider, key.key, model, promptText, timeoutFor(model));
  };
  const acceptReply = async ({ key, model }: PlannedAttempt, modelReply: string): Promise<RoutedResult> => {
    const parsedReply: unknown = JSON.parse(extractJsonReply(modelReply));
    const result = validateTaskResult(request.task, request.context, parsedReply);
    await recordSuccess(keyIdentity(key.provider, key.key), model);
    await writeResponseCache(cacheId, { value: parsedReply, provider: key.provider, model });
    return { result, provider: key.provider, model };
  };

  const promptTokens = estimateTokens(prompt);
  const rejectedKeys = new Set<string>();
  const pausedThisRun = new Set<string>();
  const busyAttempts: PlannedAttempt[] = [];
  let hasAttempted = false;
  for (const attempt of plannedAttempts) {
    if (callCount >= MAXIMUM_GENERATION_CALLS) break;
    const { key, model } = attempt;
    const keyId = keyIdentity(key.provider, key.key);
    if (rejectedKeys.has(keyId) || pausedThisRun.has(`${keyId}:${model}`)) continue;
    if (await unavailable(key.provider, key.key, model)) continue;
    const usageVerdict = await canUse(keyId, model, promptTokens);
    if (!usageVerdict.ok) {
      attemptLog.record(`${key.provider}/${model}`, new Error(`skipped: ${usageVerdict.reason}`));
      continue;
    }
    hasAttempted = true;
    try {
      const modelReply = await callModel(attempt, prompt);
      try {
        return await acceptReply(attempt, modelReply);
      } catch (validationError) {
        if (callCount >= MAXIMUM_GENERATION_CALLS) throw validationError;
        const issues = validationError instanceof Error ? validationError.message.slice(0, 2000) : 'Invalid JSON';
        const repairPrompt = `${prompt}\nPrevious invalid output: ${modelReply.slice(0, 14000)}\nValidation issues: ${issues}\nRepair the output. Reply with JSON only.`;
        return await acceptReply(attempt, await callModel(attempt, repairPrompt));
      }
    } catch (error) {
      attemptLog.record(`${key.provider}/${model}`, error);
      const outcome = await handleAttemptFailure(key, keyId, model, error);
      if (outcome === 'key-rejected') {
        await benchRejectedKey(key, error);
        rejectedKeys.add(keyId);
      } else if (outcome === 'model-paused') pausedThisRun.add(`${keyId}:${model}`);
      else if (outcome === 'temporarily-busy') busyAttempts.push(attempt);
    }
  }

  // Every model had one try. Demand spikes on Google's side usually pass in seconds.
  for (const attempt of busyAttempts.slice(0, SECOND_TRY_COUNT)) {
    if (callCount >= MAXIMUM_GENERATION_CALLS) break;
    await pause(SECOND_TRY_DELAY_MILLISECONDS);
    try {
      return await acceptReply(attempt, await callModel(attempt, prompt));
    } catch (error) {
      attemptLog.record(`${attempt.key.provider}/${attempt.model} (second try)`, error);
    }
  }
  if (!hasAttempted && plannedAttempts.length) {
    attemptLog.record(
      'gemini',
      new Error(
        'All eligible models are cooling down or unavailable. Wait or test this key to refresh model availability.',
      ),
    );
  }
  const limitNote = callCount >= MAXIMUM_GENERATION_CALLS ? ' The request safety limit was reached.' : '';
  throw new Error(`No eligible free-tier model completed this task.${limitNote}\n${attemptLog.summary()}`);
}
