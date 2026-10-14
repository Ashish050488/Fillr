import { findDeclarationTopic } from '../../shared/answers/declaration-topics';
import {
  readCurrentAnswer,
  readQuestionsToAsk,
  rememberAnswer,
  setAnswer,
  type QuestionToAsk,
} from '../answers/remembered-answers';

const PLACEHOLDER_OPTION = /^(select one|select|choose|choose one|-+)$/i;
const MAXIMUM_QUESTIONS_SHOWN = 12;

function createElement<Tag extends keyof HTMLElementTagNameMap>(
  tagName: Tag,
  className: string,
  text?: string,
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tagName);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}

/** "Do you possess a valid work permit…?*" reads better without the asterisk and boilerplate. */
const tidyLabel = (questionLabel: string) => questionLabel.replace(/\*\s*$/, '').trim();

function buildQuestionRow(questionToAsk: QuestionToAsk, onAnswered: (row: HTMLElement) => void): HTMLElement {
  const row = createElement('div', 'ask-row');
  const questionText = createElement('p', 'ask-question', tidyLabel(questionToAsk.question.label));
  questionText.title = 'Click to read the whole question';
  questionText.addEventListener('click', () => questionText.classList.toggle('expanded'));
  row.append(questionText);

  const handleAnswer = async (answer: string, control: HTMLElement) => {
    row.classList.add('busy');
    const isSet = await setAnswer(questionToAsk, answer);
    row.classList.remove('busy');
    if (!isSet) {
      control.classList.add('failed');
      return;
    }
    await rememberAnswer(questionToAsk, answer);
    onAnswered(row);
  };

  const options = (questionToAsk.question.options ?? []).filter((option) => !PLACEHOLDER_OPTION.test(option.trim()));
  if (questionToAsk.question.kind === 'choice' && options.length) {
    const optionRow = createElement('div', 'ask-options');
    for (const option of options) {
      const optionButton = createElement('button', 'ask-option r2', option);
      optionButton.type = 'button';
      optionButton.addEventListener('click', () => void handleAnswer(option, optionButton));
      optionRow.append(optionButton);
    }
    row.append(optionRow);
  } else {
    const answerForm = createElement('form', 'ask-text');
    const answerInput = createElement('input', 'ask-input');
    answerInput.placeholder = 'Your answer, e.g. N/A';
    answerInput.value = readCurrentAnswer(questionToAsk);
    const saveButton = createElement('button', 'ask-option r2', 'Save');
    saveButton.type = 'submit';
    answerForm.append(answerInput, saveButton);
    answerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (answerInput.value.trim()) void handleAnswer(answerInput.value.trim(), answerInput);
    });
    row.append(answerForm);
  }
  return row;
}

/**
 * Questions only you can answer, shown inside the widget with their options as buttons. One
 * click fills the page and JobFill remembers the answer for every later application.
 */
export function renderAskOncePanel(container: HTMLElement, jobCountry?: string): number {
  const questionsToAsk = readQuestionsToAsk().filter((questionToAsk) => !readCurrentAnswer(questionToAsk));
  container.replaceChildren();
  container.hidden = !questionsToAsk.length;
  if (!questionsToAsk.length) return 0;

  const hasCountrySpecific = questionsToAsk.some(
    (questionToAsk) => findDeclarationTopic(questionToAsk.question.label)?.isCountrySpecific,
  );
  const heading = createElement('p', 'ask-heading', 'Answer once');
  const note = createElement(
    'p',
    'ask-note',
    `Only you know these. Pick an answer and JobFill fills it here and remembers it for every later application${
      hasCountrySpecific && jobCountry ? ` (permit and sponsorship answers are kept for jobs in ${jobCountry})` : ''
    }.`,
  );
  const list = createElement('div', 'ask-list');
  const updateCount = () => {
    const remainingCount = list.childElementCount;
    heading.textContent = remainingCount
      ? `Answer once · ${remainingCount} left`
      : 'All answered. Saved for next time.';
  };
  for (const questionToAsk of questionsToAsk.slice(0, MAXIMUM_QUESTIONS_SHOWN)) {
    list.append(
      buildQuestionRow(questionToAsk, (row) => {
        row.remove();
        updateCount();
      }),
    );
  }
  container.append(heading, note, list);
  updateCount();
  return questionsToAsk.length;
}
