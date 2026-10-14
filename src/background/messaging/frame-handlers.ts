import type { FormQuestion } from '../../shared/types';
import type { RegisterMessageHandler } from './message-registrar';

const MAXIMUM_QUESTIONS = 40;
const OPEN_PANEL_HINT = 'Click the JobFill icon in the toolbar to open the panel.';

interface FrameFillReply {
  filled: number;
  ai: number;
  total: number;
  held?: boolean;
}

/** Run a frame hook in every subframe of the tab; the top frame does not define the hooks. */
async function runInSubframes<Reply>(
  tabId: number,
  hook: 'scan' | 'fill',
  hookInput?: unknown,
): Promise<Array<Reply | null>> {
  try {
    const frameReplies = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: async (hookName: string, input: unknown) => {
        const frameHooks = window as unknown as Record<
          string,
          ((hookArgument: unknown) => Promise<unknown>) | undefined
        >;
        const frameHook = frameHooks[hookName === 'scan' ? '__jobfill_frameScan' : '__jobfill_frameFill'];
        return window.top !== window && frameHook ? frameHook(input) : null;
      },
      args: [hook, hookInput ?? null],
    });
    return frameReplies.map((frameReply) => (frameReply.result ?? null) as Reply | null);
  } catch {
    return [];
  }
}

/**
 * Forms embedded in iframes (e.g. Greenhouse on a company careers page) are filled by the content
 * script running inside that frame; these handlers relay the top frame's request to them.
 */
export function registerFrameHandlers(handle: RegisterMessageHandler): void {
  handle('FRAMES_SCAN', async (_payload, sender) => {
    if (sender.tab?.id == null || sender.frameId !== 0) return { success: true, questions: [] };
    const frameQuestionLists = await runInSubframes<FormQuestion[]>(sender.tab.id, 'scan');
    const questions = frameQuestionLists.flatMap((frameQuestions, frameIndex) =>
      (frameQuestions ?? []).map((question) => ({ ...question, id: `f${frameIndex}_${question.id}` })),
    );
    return { success: true, questions: questions.slice(0, MAXIMUM_QUESTIONS) };
  });

  handle('FILL_FRAMES', async (payload, sender) => {
    if (sender.tab?.id == null || sender.frameId !== 0) return { success: true };
    const frameReplies = await runInSubframes<FrameFillReply>(sender.tab.id, 'fill', payload);
    const completedFrames = frameReplies.filter((frameReply): frameReply is FrameFillReply => Boolean(frameReply));
    return {
      success: true,
      filled: completedFrames.reduce((total, frame) => total + frame.filled, 0),
      ai: completedFrames.reduce((total, frame) => total + frame.ai, 0),
      total: completedFrames.reduce((total, frame) => total + frame.total, 0),
      held: completedFrames.some((frame) => frame.held),
    };
  });

  handle('OPEN_PANEL', async (_payload, sender) => {
    if (sender.tab?.id == null || !chrome.sidePanel?.open) return { success: false, error: OPEN_PANEL_HINT };
    try {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
      return { success: true };
    } catch {
      return { success: false, error: OPEN_PANEL_HINT };
    }
  });
}
