import type { FillSession } from './fill-session';

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
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) continue;
    if (field.value === intendedValue || field.value.trim()) continue; // Kept, or reformatted by the site.
    try {
      field.focus();
      field.select();
      const isTyped = field.ownerDocument.execCommand('insertText', false, intendedValue);
      if (!isTyped || field.value !== intendedValue) session.filledFields.delete(field);
      field.blur();
    } catch {
      session.filledFields.delete(field);
    }
  }
}
