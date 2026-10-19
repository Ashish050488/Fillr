import type { FormQuestion } from '../../shared/types';
import type { Fillable } from '../form/collect-fillable-fields';
import { hasSelection, isCombobox } from '../form/searchable-dropdown';
import { readFounderNoteBox } from './founder-note-box';
import { normalizeWhitespace, questionLabel, SENSITIVE } from './question-label';

export { questionLabel, SENSITIVE } from './question-label';
export { readJobContext } from './read-job-context';

const MAXIMUM_QUESTIONS = 40;
const LONG_ANSWER_HINT =
  /\b(cover letter|why|tell us|describe|about (yourself|you)|motivation|interest|additional information|anything else|summary|experience with|explain)\b/i;
const COMBOBOX_PLACEHOLDER = /^(select( one)?|choose|please select|none selected)$/i;

export interface PendingQuestion {
  question: FormQuestion;
  elements: Fillable[];
  /** A founder note's addressee, read from the page ("Reach out to Akash"). */
  recipientFirstName?: string;
}

function isUnanswered(element: Fillable): boolean {
  if (element instanceof HTMLSelectElement) return !element.value || element.selectedIndex <= 0;
  if (isCombobox(element)) {
    if (hasSelection(element)) return false;
    if (element instanceof HTMLInputElement) return !element.value.trim();
    return !element.textContent?.trim() || COMBOBOX_PLACEHOLDER.test(element.textContent.trim());
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return !element.value.trim();
  return !element.textContent?.trim();
}

/** Unanswered controls that need judgement rather than a saved profile value. */
export function collectQuestions(controls: Fillable[]): PendingQuestion[] {
  const pendingQuestions: PendingQuestion[] = [];
  const radioGroups = new Map<string, HTMLInputElement[]>();
  for (const element of controls) {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'radio') {
        const groupKey = `${element.form?.id ?? ''}:${element.name}`;
        if (element.name) radioGroups.set(groupKey, [...(radioGroups.get(groupKey) ?? []), element]);
        continue;
      }
      if (!['text', 'url', 'number', ''].includes(element.type) || !isUnanswered(element)) continue;
    } else if (!isUnanswered(element)) continue;
    // YC and Wellfound: the message box is a note to a named person, often with no label of its own.
    const founderNoteBox = readFounderNoteBox(element, questionLabel(element));
    const label = founderNoteBox?.label ?? questionLabel(element);
    if (!label || SENSITIVE.test(label)) continue;
    let kind: FormQuestion['kind'] = 'short';
    let options: string[] | undefined;
    if (element instanceof HTMLSelectElement) {
      kind = 'choice';
      options = Array.from(element.options)
        .filter((option, optionIndex) => optionIndex > 0 || option.value)
        .map((option) => normalizeWhitespace(option.textContent))
        .filter(Boolean)
        .slice(0, 80);
      if (options.length < 2) continue;
    } else if (element instanceof HTMLTextAreaElement || element.isContentEditable || LONG_ANSWER_HINT.test(label)) {
      kind = element instanceof HTMLInputElement ? 'short' : 'long';
    }
    const maxLength = (element as HTMLInputElement).maxLength > 0 ? (element as HTMLInputElement).maxLength : undefined;
    pendingQuestions.push({
      question: {
        id: `q${pendingQuestions.length}`,
        label,
        kind,
        ...(options ? { options } : {}),
        ...(maxLength ? { maxLength } : {}),
      },
      elements: [element],
      ...(founderNoteBox?.recipientFirstName ? { recipientFirstName: founderNoteBox.recipientFirstName } : {}),
    });
  }
  for (const radioGroup of radioGroups.values()) {
    if (radioGroup.some((radio) => radio.checked)) continue;
    const label = questionLabel(radioGroup[0]);
    if (!label || SENSITIVE.test(label)) continue;
    const options = radioGroup
      .map(
        (radio) =>
          normalizeWhitespace(
            Array.from(radio.labels ?? [])
              .map((radioLabel) => radioLabel.textContent)
              .join(' '),
          ) || radio.value,
      )
      .filter(Boolean);
    if (options.length < 2) continue;
    pendingQuestions.push({
      question: { id: `q${pendingQuestions.length}`, label, kind: 'choice', options },
      elements: radioGroup,
    });
  }
  return pendingQuestions.slice(0, MAXIMUM_QUESTIONS);
}
