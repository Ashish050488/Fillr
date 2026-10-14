import { sendMessage } from '../../shared/messaging/extension-messages';
import type { PageScan } from '../../shared/types';
import { collectFillables, type Fillable } from '../form/collect-fillable-fields';
import { bestMatch, type ProfileValues } from '../form/match-profile-field';
import { collectQuestions, readJobContext, type PendingQuestion } from '../page/collect-questions';
import { buildPageScan } from './fill-ai-answers';
import { fillPage } from './fill-page';
import type { JobContext } from './fill-types';
import { loadFillProfile } from './load-fill-profile';

const MAXIMUM_QUESTIONS = 40;

function isFilledFromProfile(field: Fillable, values: ProfileValues): boolean {
  if (field.tagName === 'INPUT' && (field as HTMLInputElement).type === 'file') return true;
  return Boolean(bestMatch(field, values));
}

/** Questions on this page that your saved details cannot answer. */
async function collectOpenQuestions(): Promise<PendingQuestion[]> {
  let profileValues: ProfileValues = {};
  try {
    profileValues = (await loadFillProfile()).values;
  } catch {
    // Analysis still works without a profile match.
  }
  return collectQuestions(collectFillables().filter((field) => !isFilledFromProfile(field, profileValues)));
}

/** What the side panel analyses: the posting text plus open questions here and in embedded forms. */
export async function scanPage(): Promise<PageScan> {
  const questions = (await collectOpenQuestions()).map((pending) => pending.question);
  const isTopFrame = window.top === window;
  const embeddedScan = isTopFrame ? await sendMessage('FRAMES_SCAN', undefined).catch(() => undefined) : undefined;
  return buildPageScan(
    readJobContext(),
    [...questions, ...(embeddedScan?.questions ?? [])].slice(0, MAXIMUM_QUESTIONS),
  );
}

/** Hooks the top frame calls (through the background) inside embedded application iframes. */
export function registerFrameHooks(): void {
  const frameHooks = window as Window & { __jobfill_frameFill?: unknown; __jobfill_frameScan?: unknown };
  frameHooks.__jobfill_frameScan = async () => (await collectOpenQuestions()).map((pending) => pending.question);
  frameHooks.__jobfill_frameFill = async (hookInput: { context: JobContext; force?: boolean }) => {
    if (!collectFillables().length) return null;
    const fillResult = await fillPage({ context: hookInput.context, force: hookInput.force });
    return {
      filled: fillResult.filledCount,
      ai: fillResult.aiCount ?? 0,
      total: fillResult.totalCount,
      held: fillResult.held,
      error: fillResult.aiError,
    };
  };
}
