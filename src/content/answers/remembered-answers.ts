import {
  candidateAnswerKeys,
  findDeclarationTopic,
  rememberedAnswerKey,
} from '../../shared/answers/declaration-topics';
import { sendMessage } from '../../shared/messaging/extension-messages';
import { setFieldValue } from '../fill/fill-saved-details';
import type { FillSession } from '../fill/fill-session';
import type { Fillable } from '../form/collect-fillable-fields';
import { isChoiceButton, isChoiceSelected } from '../form/choice-button-groups';
import { isListboxButton } from '../form/searchable-dropdown';
import type { PendingQuestion } from '../page/collect-questions';
import { normalizeWhitespace } from '../page/question-label';

/** A question JobFill could not answer, waiting for you to answer it once. */
export interface QuestionToAsk extends PendingQuestion {
  answerKey: string;
}

const PLACEHOLDER_CHOICE = /^(select one|select|choose|select\.\.\.|choose one|-+)$/i;

let questionsToAsk: QuestionToAsk[] = [];
let askedJobCountry: string | undefined;
export const readQuestionsToAsk = () => questionsToAsk;
export const readAskedJobCountry = () => askedJobCountry;
export const isDeclaration = (pending: PendingQuestion) => Boolean(findDeclarationTopic(pending.question.label));

export function setQuestionsToAsk(pendingQuestions: PendingQuestion[], jobCountry: string | undefined): void {
  askedJobCountry = jobCountry;
  questionsToAsk = pendingQuestions.map((pending) => ({
    ...pending,
    answerKey: rememberedAnswerKey(pending.question.label, jobCountry),
  }));
}

/** Puts the answer in the question's field; returns the element that took it (one per question). */
export async function setAnswer(pending: PendingQuestion, answer: string): Promise<Fillable | undefined> {
  for (const element of pending.elements) {
    try {
      if (await setFieldValue(element, answer)) return element;
    } catch {
      // Try the next element (radio groups and button rows hold several).
    }
  }
  return undefined;
}

/**
 * A Yes/No answer used where the form wants typed text: "which countries need sponsorship?"
 * becomes "N/A" for No (the form's own wording for none).
 */
function adaptToQuestion(savedAnswer: string, pending: PendingQuestion): string {
  if (pending.question.kind === 'choice' || !/^no$/i.test(savedAnswer.trim())) return savedAnswer;
  const isSponsorshipList = findDeclarationTopic(pending.question.label)?.topic === 'sponsorship';
  return isSponsorshipList || /\bn\/?a\b|not applicable/i.test(pending.question.label) ? 'N/A' : savedAnswer;
}

/** Fills every question answered on an earlier form. Returns the ones still unanswered. */
export async function fillRememberedAnswers(
  pendingQuestions: PendingQuestion[],
  session: FillSession,
  jobCountry: string | undefined,
): Promise<PendingQuestion[]> {
  if (!pendingQuestions.length) return pendingQuestions;
  const keysPerQuestion = pendingQuestions.map((pending) => candidateAnswerKeys(pending.question.label, jobCountry));
  const reply = await sendMessage('ANSWERS_LOOKUP', { keys: [...new Set(keysPerQuestion.flat())] }).catch(
    () => undefined,
  );
  const rememberedAnswers = reply?.answers ?? {};
  const stillUnanswered: PendingQuestion[] = [];
  for (const [questionIndex, pending] of pendingQuestions.entries()) {
    const savedAnswer = keysPerQuestion[questionIndex].map((answerKey) => rememberedAnswers[answerKey]).find(Boolean);
    const answer = savedAnswer && adaptToQuestion(savedAnswer, pending);
    const answeredElement = answer ? await setAnswer(pending, answer) : undefined;
    if (answeredElement) session.markFilled(answeredElement);
    else stillUnanswered.push(pending);
  }
  return stillUnanswered;
}

/** What you have put in a question's field yourself, if anything. */
export function readCurrentAnswer(pending: PendingQuestion): string {
  for (const element of pending.elements) {
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      if (element.checked)
        return normalizeWhitespace(
          Array.from(element.labels ?? [])
            .map((label) => label.textContent)
            .join(' '),
        );
      continue;
    }
    if (element instanceof HTMLSelectElement)
      return element.selectedIndex > 0 ? normalizeWhitespace(element.selectedOptions[0]?.textContent) : '';
    if (isChoiceButton(element)) {
      if (isChoiceSelected(element)) return normalizeWhitespace(element.textContent);
      continue;
    }
    if (isListboxButton(element)) {
      const buttonText = normalizeWhitespace(element.textContent);
      return PLACEHOLDER_CHOICE.test(buttonText) ? '' : buttonText;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element.value.trim();
  }
  return '';
}

export function rememberAnswer(questionToAsk: QuestionToAsk, answer: string): Promise<unknown> {
  return sendMessage('ANSWER_REMEMBER', {
    entries: [{ key: questionToAsk.answerKey, label: questionToAsk.question.label, answer }],
  }).catch(() => undefined);
}

/**
 * Answers you gave on the page yourself are remembered when you move on (Save and Continue,
 * Next, Submit), so you are never asked the same thing twice.
 */
export function rememberAnswersGivenOnPage(): void {
  const entries = questionsToAsk
    .map((questionToAsk) => ({ questionToAsk, answer: readCurrentAnswer(questionToAsk) }))
    .filter(({ answer }) => answer)
    .map(({ questionToAsk, answer }) => ({
      key: questionToAsk.answerKey,
      label: questionToAsk.question.label,
      answer,
    }));
  if (entries.length) void sendMessage('ANSWER_REMEMBER', { entries }).catch(() => undefined);
}
