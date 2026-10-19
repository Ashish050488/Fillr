import type { FillSession } from './fill-session';
import { fillElement } from '../form/set-field-value';

const RENDER_SETTLE_MILLISECONDS = 350;

/**
 * React and Vue forms sometimes re-render and drop a value set by code. After a moment, any
 * text field that lost its value is retried with execCommand('insertText'), which produces
 * genuine input events the framework accepts, as if typed.
 */
export async function reapplyRevertedValues(session: FillSession): Promise<void> {
  if (!session.intendedValues.size) return;
  await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MILLISECONDS));
  for (const [field, intendedValue] of session.intendedValues) {
    if (!isEmptyAfterRender(field, intendedValue)) continue;
    try {
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.focus();
        field.select();
        const isTyped = field.ownerDocument.execCommand('insertText', false, intendedValue);
        if (!isTyped || field.value !== intendedValue) session.filledFields.delete(field);
        field.blur();
      } else if (!fillElement(field, intendedValue)) session.filledFields.delete(field);
    } catch {
      session.filledFields.delete(field);
    }
  }
}

function isEmptyAfterRender(field: Element, intendedValue: string): boolean {
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
    return !field.value.trim() && field.value !== intendedValue;
  if (field instanceof HTMLSelectElement) return !field.value || field.selectedIndex <= 0;
  if ((field as HTMLElement).isContentEditable || field.getAttribute('role') === 'textbox')
    return !field.textContent?.trim();
  return false;
}
