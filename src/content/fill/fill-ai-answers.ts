import { sendMessage, sendMessageWithin } from '../../shared/messaging/extension-messages';
import { greetByName } from '../../shared/jobs/note-recipient';
import type { FormQuestion, PageScan } from '../../shared/types';
import type { Fillable } from '../form/collect-fillable-fields';
import { findChoiceButtonGroups, isChoiceSelected } from '../form/choice-button-groups';
import { isListboxButton, readListboxOptions } from '../form/searchable-dropdown';
import { collectQuestions, questionLabel, SENSITIVE, type PendingQuestion } from '../page/collect-questions';
import { readJobCountry } from '../answers/job-country';
import { fillRememberedAnswers, isDeclaration, setQuestionsToAsk } from '../answers/remembered-answers';
import { insideEntries } from '../workday/workday-history';
import { isDatePickerField } from '../form/date-picker';
import { attachCoverLetterPdf, COVER_LETTER_FILE_QUESTION, findCoverLetterUploads } from './cover-letter-upload';
import { setFieldValue } from './fill-saved-details';
import { attemptedFields, type FillSession } from './fill-session';
import type { JobContext } from './fill-types';

const MAXIMUM_QUESTIONS = 40;
const MAXIMUM_BUTTON_DROPDOWNS = 15;
const AI_REPLY_TIMEOUT_MILLISECONDS = 210_000;
const isTopFrame = () => window.top === window;

export function buildPageScan(context: JobContext, questions: FormQuestion[]): PageScan {
  return { ...context, pageText: context.pageText.slice(0, 60000), questions };
}

/** Button dropdowns (Workday's Yes/No questions): read their options so AI can choose one. */
async function collectButtonDropdownQuestions(fields: Fillable[], session: FillSession, isAutomatic?: boolean) {
  const questions: PendingQuestion[] = [];
  const unansweredButtons = fields
    .filter(
      (field): field is HTMLButtonElement =>
        isListboxButton(field) && !session.isFilled(field) && !insideEntries(field),
    )
    .filter((button) => !(isAutomatic && attemptedFields.has(button)))
    .slice(0, MAXIMUM_BUTTON_DROPDOWNS);
  for (const button of unansweredButtons) {
    attemptedFields.add(button);
    const label = questionLabel(button);
    const buttonText = (button.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!label || SENSITIVE.test(label) || !/^(select one|select|choose)?$/i.test(buttonText)) continue;
    const options = await readListboxOptions(button);
    if (options.length >= 2)
      questions.push({ question: { id: `lb${questions.length}`, label, kind: 'choice', options }, elements: [button] });
  }
  return questions;
}

/** Ashby-style Yes/No button rows that are still unanswered. */
function collectChoiceButtonQuestions(): PendingQuestion[] {
  return findChoiceButtonGroups()
    .filter((group) => !group.buttons.some(isChoiceSelected) && !SENSITIVE.test(group.label))
    .map((group, groupIndex) => ({
      question: {
        id: `bg${groupIndex}`,
        label: group.label,
        kind: 'choice' as const,
        options: group.buttons.map((button) => (button.textContent ?? '').trim()),
      },
      elements: group.buttons,
    }));
}

export interface AiAnswerOutcome {
  aiError?: string;
  held: boolean;
  score?: number;
  askCount?: number;
}

/**
 * Questions that need judgement (cover letter, "why us", Yes/No choices) go to AI in one pass,
 * together with any embedded form's questions. Name, email and links never wait on this.
 */
export async function fillAiAnswers(
  fields: Fillable[],
  context: JobContext,
  session: FillSession,
  options: {
    force?: boolean;
    isAutomatic?: boolean;
    reportProgress: (text: string) => void;
    /** Names the generated cover letter file: "Ashish Ranjan - Cover Letter.pdf". */
    applicantName?: string;
  },
): Promise<AiAnswerOutcome> {
  const pendingQuestions = collectQuestions(
    // Calendars take a date from your profile, never AI prose.
    fields.filter((field) => !session.isFilled(field) && !insideEntries(field) && !isDatePickerField(field)),
  );
  pendingQuestions.push(...(await collectButtonDropdownQuestions(fields, session, options.isAutomatic)));
  pendingQuestions.push(...collectChoiceButtonQuestions());
  // Answers you gave once come first; your own declarations (work permit, conflicts…) never go to AI.
  const jobCountry = await readJobCountry();
  const unansweredQuestions = await fillRememberedAnswers(pendingQuestions, session, jobCountry);
  const declarationQuestions = unansweredQuestions.filter(isDeclaration);
  const aiQuestions = unansweredQuestions.filter((pending) => !isDeclaration(pending));
  const rememberLeftovers = () =>
    setQuestionsToAsk(
      unansweredQuestions.filter((pending) => !pending.elements.some((element) => session.isFilled(element))),
      jobCountry,
    );
  rememberLeftovers();
  const embeddedQuestions =
    isTopFrame() && document.querySelector('iframe')
      ? ((await sendMessage('FRAMES_SCAN', undefined).catch(() => undefined))?.questions ?? [])
      : [];
  // A cover letter asked for as a file: AI writes it with the rest, then it is attached as a PDF.
  const coverLetterUploads = findCoverLetterUploads();
  const coverLetterFileQuestions = coverLetterUploads.length ? [COVER_LETTER_FILE_QUESTION] : [];
  const questionCount = aiQuestions.length + embeddedQuestions.length + coverLetterFileQuestions.length;
  if (!questionCount) return { held: false };

  const savedDetailCount = session.filledFields.size;
  options.reportProgress(
    `Filled ${savedDetailCount} saved details. Writing ${questionCount} answer${questionCount === 1 ? '' : 's'}…`,
  );
  try {
    const allQuestions = [
      ...coverLetterFileQuestions,
      ...aiQuestions.map((pending) => pending.question),
      ...embeddedQuestions,
    ].slice(0, MAXIMUM_QUESTIONS);
    // Bounded: if the AI is slow or the background restarts, your saved details are already in.
    const reply = await sendMessageWithin(
      'JOB_PREPARE',
      { scan: buildPageScan(context, allQuestions), force: options.force },
      AI_REPLY_TIMEOUT_MILLISECONDS,
      'The AI took too long. Your saved details are filled; press Autofill again to retry the questions.',
    );
    if (!reply.success) throw new Error(reply.error ?? 'AI could not prepare this application.');
    for (const { question, elements, recipientFirstName } of aiQuestions) {
      const modelAnswer = reply.answers?.[question.id];
      if (!modelAnswer) continue;
      // The page names who reads the note ("Reach out to Akash"): greet them, never "Hi team".
      const answer = recipientFirstName ? greetByName(modelAnswer, recipientFirstName) : modelAnswer;
      for (const element of elements) {
        try {
          if (await setFieldValue(element, answer)) {
            session.markFilled(element);
            break;
          }
        } catch {
          // Keep going.
        }
      }
    }
    const coverLetter = reply.answers?.[COVER_LETTER_FILE_QUESTION.id] || reply.job?.coverLetter || '';
    if (coverLetterUploads.length)
      attachCoverLetterPdf(coverLetterUploads, coverLetter, session, options.applicantName);
    rememberLeftovers();
    return { held: Boolean(reply.held), score: reply.job?.analysis?.score, askCount: declarationQuestions.length };
  } catch (error) {
    return { held: false, aiError: error instanceof Error ? error.message : 'AI answers failed.' };
  }
}
