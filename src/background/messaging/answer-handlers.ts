import {
  forgetAnswer,
  lookUpRememberedAnswers,
  readRememberedAnswers,
  rememberAnswers,
} from '../answers/remembered-answers-store';
import { isExtensionPage, type RegisterMessageHandler } from './message-registrar';

const MAXIMUM_KEYS_PER_LOOKUP = 80;

/** Answers you gave once (work permit, sponsorship, conflicts…), reused on every later form. */
export function registerAnswerHandlers(handle: RegisterMessageHandler): void {
  handle('ANSWERS_LOOKUP', async (payload) => {
    const answerKeys = (payload?.keys ?? []).filter((answerKey) => typeof answerKey === 'string');
    return { success: true, answers: await lookUpRememberedAnswers(answerKeys.slice(0, MAXIMUM_KEYS_PER_LOOKUP)) };
  });

  handle('ANSWER_REMEMBER', async (payload) => {
    const entries = (payload?.entries ?? []).filter(
      (entry) => typeof entry?.key === 'string' && typeof entry.answer === 'string' && typeof entry.label === 'string',
    );
    await rememberAnswers(entries);
    return { success: true };
  });

  // Listing and forgetting all answers is for the side panel only, never for web pages.
  handle('ANSWERS_LIST', async (_payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, answers: {}, error: 'Not allowed' };
    return { success: true, answers: await readRememberedAnswers() };
  });

  handle('ANSWER_FORGET', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Not allowed' };
    await forgetAnswer(String(payload?.key ?? ''));
    return { success: true };
  });
}
