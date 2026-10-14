import type { AIProvider, AITask } from '../../../shared/types';
import type { ModelInfo } from '../providers/provider-client';

/**
 * Free-tier Gemini API text models in tiers (Gemini API models page; Pro left the free tier).
 * Full IDs always come from model discovery, so a renamed or retired model is simply absent.
 *  - lite:  Flash-Lite, the largest free daily quota and the fastest replies.
 *  - flash: best writing quality, but a small daily quota and frequent "high demand" 503s.
 *  - gemma: very high request quota but slow (it reasons first) and only ~15k tokens a minute.
 */
const TIERS = {
  lite: ['gemini 3.5 flash lite', 'gemini 3.1 flash lite', 'gemini 2.5 flash lite'],
  flash: ['gemini 3.8 flash', 'gemini 3.6 flash', 'gemini 3 flash', 'gemini 2.5 flash'],
  gemma: ['gemma 4 26b', 'gemma 4 31b', 'gemma 3 27b'],
} as const;
type Tier = keyof typeof TIERS;

/** Which tiers each task tries, in order. */
const TASK_TIERS: Record<AITask, Tier[]> = {
  // Once a month and must be quick: Gemini first, Gemma only as a last resort.
  resume_parsing: ['lite', 'flash', 'gemma'],
  // Cleaning a noisy page is easy work: spend Gemma's large quota, Flash-Lite as backup.
  job_parsing: ['gemma', 'lite', 'flash'],
  fill_empty_fields: ['lite', 'gemma', 'flash'],
  // Writing quality matters most here.
  job_match: ['flash', 'lite', 'gemma'],
  answer_questions: ['flash', 'lite', 'gemma'],
  cover_letter_answers: ['flash', 'lite', 'gemma'],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/^models\//, '')
    .replace(/^google[/:]\s*/, '')
    .replace(/:free$/, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

const EXCLUDED = /\b(image|audio|tts|live|robotics|embedding|pro|preview|transcribe|translate|exp|omni|nano)\b/;

function inTier(model: ModelInfo, tier: Tier): number {
  const id = normalize(model.id);
  const display = normalize(model.displayName ?? '');
  const family = tier === 'gemma' ? 'gemma' : 'gemini';
  if (!id.startsWith(`${family} `) || EXCLUDED.test(id)) return -1;
  // "flash" must not swallow "flash lite".
  if (tier === 'flash' && /\blite\b/.test(id)) return -1;
  return TIERS[tier].findIndex((label) => {
    if (id === label || display === label) return true;
    // Gemma instruction-tuned/active-parameter suffixes (e.g. "26b a4b it") identify a listed size.
    return tier === 'gemma' && id.startsWith(`${label} `) && /^(it|a\d+b)( it)?$/.test(id.slice(label.length + 1));
  });
}

/**
 * Models for a task, best tier first. `turn` rotates the starting model inside each tier
 * (round robin), so consecutive requests spread across separate per-model free quotas.
 */
export function taskModels(
  catalog: ModelInfo[],
  task: AITask,
  provider: AIProvider,
  preferred?: string,
  turn = 0,
): string[] {
  const usable = catalog.filter((model) => provider === 'gemini' || (provider === 'openrouter' && model.free === true));
  const ordered: string[] = [];
  for (const tier of TASK_TIERS[task]) {
    const models = usable
      .map((model) => ({ id: model.id, rank: inTier(model, tier) }))
      .filter((item) => item.rank >= 0)
      .sort((left, right) => left.rank - right.rank)
      .map((item) => item.id);
    const start = models.length ? turn % models.length : 0;
    ordered.push(...models.slice(start), ...models.slice(0, start));
  }
  const candidates = [...new Set(ordered)];
  const wanted = preferred?.replace(/^models\//, '');
  return wanted && candidates.includes(wanted) ? [wanted, ...candidates.filter((id) => id !== wanted)] : candidates;
}

/** Gemma reasons before answering and is slow; Gemini Flash models answer quickly. */
export function timeoutFor(model: string): number {
  return /gemma/i.test(model) ? 90_000 : 60_000;
}
