/**
 * Client-side free-tier accounting per (key, model), modelled on jobmesh's rate-limit tracker
 * and circuit breaker. It lets the router skip a combination BEFORE spending a request:
 *  - RPM / RPD / TPM ceilings with a safety margin (Google's limit is still the real authority);
 *  - daily exhaustion when the API reports RESOURCE_EXHAUSTED, reset at the Pacific-time day
 *    boundary Google's free tier uses;
 *  - a breaker that skips a combo after repeated server failures, then lets one probe through.
 * Persisted in chrome.storage so a sleeping service worker does not forget.
 */
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';

export interface Limits {
  rpm: number;
  rpd: number;
  tpm: number;
}

/** Published free-tier limits by model family (Gemini API rate-limit docs; same table as jobmesh). */
const MODEL_LIMITS: Array<[RegExp, Limits]> = [
  [/^gemma-/, { rpm: 30, rpd: 14_400, tpm: 15_000 }],
  [/flash-lite/, { rpm: 15, rpd: 500, tpm: 250_000 }],
  [/flash/, { rpm: 5, rpd: 20, tpm: 250_000 }],
];
const CONSERVATIVE_LIMITS: Limits = { rpm: 5, rpd: 20, tpm: 16_000 };
const SAFETY_MARGIN = 0.9;
const ONE_MINUTE_MILLISECONDS = 60_000;
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MILLISECONDS = 5 * ONE_MINUTE_MILLISECONDS;
const USAGE_STORAGE_KEY = 'jobfill_ai_usage_v1';

export const limitsFor = (model: string): Limits =>
  MODEL_LIMITS.find(([pattern]) => pattern.test(model))?.[1] ?? CONSERVATIVE_LIMITS;

/** ~4 characters per token, rounded up: a budgeting guard, not billing. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export function pacificDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

interface UsageEntry {
  day: string;
  count: number;
  minute: number[];
  tokens: Array<[number, number]>;
  exhausted?: string;
  failures: number;
  openedAt: number;
}
type UsageStore = Record<string, UsageEntry>;

let pendingUsageWork: Promise<unknown> = Promise.resolve();
function withUsageStore<Outcome>(
  work: (store: UsageStore) => Promise<Outcome> | Outcome,
  shouldSave = false,
): Promise<Outcome> {
  const queuedWork = pendingUsageWork.then(async () => {
    const store = await getStorage<UsageStore>(USAGE_STORAGE_KEY, {});
    const outcome = await work(store);
    if (shouldSave) await setStorage({ [USAGE_STORAGE_KEY]: store });
    return outcome;
  });
  pendingUsageWork = queuedWork.catch(() => undefined);
  return queuedWork;
}

function readUsageEntry(store: UsageStore, entryId: string, now: number): UsageEntry {
  const today = pacificDay(new Date(now));
  const current = store[entryId] ?? { day: today, count: 0, minute: [], tokens: [], failures: 0, openedAt: 0 };
  if (current.day !== today) {
    current.day = today;
    current.count = 0;
  }
  current.minute = current.minute.filter((stamp) => now - stamp < ONE_MINUTE_MILLISECONDS);
  current.tokens = current.tokens.filter(([stamp]) => now - stamp < ONE_MINUTE_MILLISECONDS);
  store[entryId] = current;
  return current;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/** Would this request fit right now? Explains why not, for the error message. */
export function canUse(keyId: string, model: string, tokens: number, now = Date.now()): Promise<Verdict> {
  return withUsageStore((store) => {
    const usage = readUsageEntry(store, `${keyId}|${model}`, now);
    const limits = limitsFor(model);
    if (usage.exhausted === usage.day)
      return { ok: false, reason: `daily free quota used up (resets at midnight Pacific time)` };
    if (usage.count >= Math.floor(limits.rpd * SAFETY_MARGIN))
      return { ok: false, reason: `about ${usage.count} of ${limits.rpd} free requests used today` };
    if (usage.minute.length >= Math.max(1, Math.floor(limits.rpm * SAFETY_MARGIN)))
      return { ok: false, reason: 'per-minute limit, try again shortly' };
    if (tokens > limits.tpm * SAFETY_MARGIN)
      return { ok: false, reason: `request too large for this model (${tokens} tokens)` };
    const spent = usage.tokens.reduce((sum, [, count]) => sum + count, 0);
    if (spent + tokens > limits.tpm * SAFETY_MARGIN)
      return { ok: false, reason: 'per-minute token budget, try again shortly' };
    if (usage.failures >= BREAKER_THRESHOLD && now - usage.openedAt < BREAKER_COOLDOWN_MILLISECONDS)
      return { ok: false, reason: 'failing repeatedly, paused for a few minutes' };
    return { ok: true };
  });
}

export function recordRequest(keyId: string, model: string, tokens: number, now = Date.now()): Promise<void> {
  return withUsageStore((store) => {
    const usage = readUsageEntry(store, `${keyId}|${model}`, now);
    usage.count += 1;
    usage.minute.push(now);
    usage.tokens.push([now, tokens]);
  }, true);
}

export function recordSuccess(keyId: string, model: string, now = Date.now()): Promise<void> {
  return withUsageStore((store) => {
    const usage = readUsageEntry(store, `${keyId}|${model}`, now);
    usage.failures = 0;
    usage.openedAt = 0;
  }, true);
}

/** Server errors count toward the breaker; a failed probe after cooldown re-opens it immediately. */
export function recordFailure(keyId: string, model: string, now = Date.now()): Promise<void> {
  return withUsageStore((store) => {
    const usage = readUsageEntry(store, `${keyId}|${model}`, now);
    usage.failures += 1;
    if (usage.failures >= BREAKER_THRESHOLD) usage.openedAt = now;
  }, true);
}

export function markExhausted(keyId: string, model: string, now = Date.now()): Promise<void> {
  return withUsageStore((store) => {
    const usage = readUsageEntry(store, `${keyId}|${model}`, now);
    usage.exhausted = usage.day;
  }, true);
}

/** "Quota exceeded for ... per day" or RESOURCE_EXHAUSTED: the day is gone for that key and model. */
export function isDailyQuota(message: string): boolean {
  return (
    /per ?day|perday|daily|RequestsPerDay/i.test(message) ||
    (/RESOURCE_EXHAUSTED|quota/i.test(message) && !/per ?minute|perminute/i.test(message))
  );
}

export interface UsageRow {
  model: string;
  used: number;
  limit: number;
  exhausted: boolean;
}

/** Today's usage per model across keys, for the Settings screen. Never exposes key material. */
export function usageToday(now = Date.now()): Promise<UsageRow[]> {
  return withUsageStore((store) => {
    const today = pacificDay(new Date(now));
    const rows = new Map<string, UsageRow>();
    for (const [entryId, usage] of Object.entries(store)) {
      const model = entryId.slice(entryId.lastIndexOf('|') + 1);
      const row = rows.get(model) ?? { model, used: 0, limit: 0, exhausted: false };
      row.used += usage.day === today ? usage.count : 0;
      row.limit += limitsFor(model).rpd;
      row.exhausted ||= usage.exhausted === today;
      rows.set(model, row);
    }
    return [...rows.values()].sort((left, right) => right.used - left.used);
  });
}
