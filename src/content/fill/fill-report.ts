import { isChoiceButton, isChoiceSelected, type ChoiceButtonGroup } from '../form/choice-button-groups';
import type { Fillable } from '../form/collect-fillable-fields';
import { fieldSignals } from '../form/match-profile-field';
import { questionLabel } from '../page/question-label';
import type { FillSession } from './fill-session';

/** Where a field's value came from, or that it still needs you. */
export type FillReportStatus = 'saved' | 'ai' | 'needs-you';

export interface FillReportRow {
  label: string;
  status: FillReportStatus;
  isRequired: boolean;
  element: Element;
}

/** The stages a fill moves through, for the widget's progress bar. */
export type FillStage = 'reading' | 'details' | 'answers' | 'checking';

const MAXIMUM_LABEL_LENGTH = 70;
let lastReport: FillReportRow[] = [];

function readLabel(element: Element): string {
  const input = element as HTMLInputElement;
  const label = questionLabel(element) || fieldSignals(element)[0] || (input.type === 'file' ? 'File upload' : 'Field');
  return label.replace(/\s*\*\s*$/, '').slice(0, MAXIMUM_LABEL_LENGTH);
}

/** The field already holds an answer: text, a chosen file, or a ticked option. */
export function hasValue(element: Element): boolean {
  const input = element as HTMLInputElement;
  if (input.type === 'file') return Boolean(input.files?.length);
  if (input.type === 'radio' || input.type === 'checkbox') return input.checked;
  if ('value' in input && typeof input.value === 'string') return input.value.trim() !== '';
  return Boolean((element.textContent ?? '').trim()) && element.getAttribute('contenteditable') === 'true';
}

function isRequired(element: Element): boolean {
  return (
    (element as HTMLInputElement).required ||
    element.getAttribute('aria-required') === 'true' ||
    /\*\s*$/.test(questionLabel(element))
  );
}

/**
 * One row per question: radio buttons and checkboxes of one group count once. Fields filled
 * before the AI step came from your saved details; the rest were written for this job.
 */
export function buildFillReport(
  fields: Fillable[],
  session: FillSession,
  savedDetailFields: Set<Element>,
  choiceGroups: ChoiceButtonGroup[] = [],
) {
  const seenGroups = new Set<string>();
  const rows: FillReportRow[] = [];
  const candidates = [...new Set<Element>([...session.filledFields, ...fields])];
  for (const element of candidates) {
    // Button rows get one row each below, not one per button.
    if (isChoiceButton(element)) continue;
    // Ashby's "Autofill from resume" box only pre-fills the form; it is not a question.
    if ((element as HTMLInputElement).type === 'file' && /autofill|parse|import/i.test(readLabel(element))) continue;
    const input = element as HTMLInputElement;
    const isGroupMember = ['radio', 'checkbox'].includes(input.type) && input.name;
    const groupKey = isGroupMember ? `group:${input.name}` : '';
    const groupIsFilled = isGroupMember
      ? candidates.some(
          (other) =>
            (other as HTMLInputElement).name === input.name &&
            (session.isFilled(other) || (other as HTMLInputElement).checked),
        )
      : false;
    if (groupKey && seenGroups.has(groupKey)) continue;
    if (groupKey) seenGroups.add(groupKey);
    // A value already there (an earlier fill, the site's own resume parser, or you) is done too.
    const isFilled = session.isFilled(element) || groupIsFilled || hasValue(element);
    const isWrittenByAi = session.isFilled(element) && !savedDetailFields.has(element);
    const status: FillReportStatus = !isFilled ? 'needs-you' : isWrittenByAi ? 'ai' : 'saved';
    rows.push({ label: readLabel(element), status, isRequired: isRequired(element), element });
  }
  // Yes/No and "How did you hear?" button rows are one question each.
  for (const group of choiceGroups) {
    const isAnswered = group.buttons.some((button) => isChoiceSelected(button) || session.isFilled(button));
    const isFromSaved = group.buttons.some((button) => savedDetailFields.has(button));
    const isFromAi = !isFromSaved && group.buttons.some((button) => session.isFilled(button));
    rows.push({
      label: group.label.replace(/\s*\*\s*$/, '').slice(0, MAXIMUM_LABEL_LENGTH),
      status: !isAnswered ? 'needs-you' : isFromAi ? 'ai' : 'saved',
      isRequired: /\*\s*$/.test(group.label),
      element: group.buttons[0]!,
    });
  }
  // What needs you first, required before optional.
  const order: Record<FillReportStatus, number> = { 'needs-you': 0, ai: 1, saved: 2 };
  rows.sort(
    (first, second) =>
      order[first.status] - order[second.status] || Number(second.isRequired) - Number(first.isRequired),
  );
  lastReport = rows;
  return rows;
}

export const readLastFillReport = () => lastReport;
