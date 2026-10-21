import { readAccessibleFieldSignals, readFieldMetadata } from '../form/accessible-field-signals';

/** Questions JobFill never asks AI to answer: demographics, identity numbers and non-questions. */
export const SENSITIVE =
  /\b(gender|sex|race|ethnic|hispanic|latino|veteran|disab|sexual orientation|transgender|pronoun|religio|date of birth|birth ?date|social security|ssn|criminal|convict|captcha|password|search)\b/i;

export const normalizeWhitespace = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

// "6c25a598-02f2-4035-a8e1-c0db110c90ad@2.00x" (an image's file id) or a long hash inside visible text.
const MACHINE_ID_TOKEN =
  /\b[0-9a-f]{8}(?:[\s_-][0-9a-f]{4}){3}[\s_-][0-9a-f]{12}\b(?:@\d+(?:\.\d+)?x)?|@\d+(?:\.\d+)?x|\b(?=[0-9a-f]*\d)[0-9a-f]{16,}\b/gi;

/** Text as a person reads it: ids and image file names that leak into page text are dropped. */
export const stripMachineIds = (text: string) => normalizeWhitespace(text.replace(MACHINE_ID_TOKEN, ' '));

/** Human-readable question text for a control, as an applicant would read it. */
export function questionLabel(element: Element): string {
  return stripMachineIds(readQuestionLabel(element));
}

function readQuestionLabel(element: Element): string {
  const input = element as HTMLInputElement;
  if (input.type === 'radio') {
    const group = element.closest('fieldset, [role="radiogroup"], [role="group"]');
    const legend = group?.querySelector('legend, [id$="label"], label:not(:has(input))');
    if (legend) return normalizeWhitespace(legend.textContent).slice(0, 400);
  }
  const readableParts = (parts: Array<string | null | undefined>) =>
    parts.map(normalizeWhitespace).filter((part) => part && !isMachineId(part));
  // Metadata (Ashby's "_systemfield_name", UUIDs) is only a fallback for fields with no real label.
  const accessibleParts = readableParts(readAccessibleFieldSignals(element));
  const labelParts = accessibleParts.length
    ? accessibleParts
    : // Check for ids before turning "first_name" into "first name", or a UUID would pass as words.
      readableParts(readFieldMetadata(element)).map((value) => value.replace(/[_-]+/g, ' '));
  if (labelParts.length) return [...new Set(labelParts)].join(' — ').slice(0, 400);
  const nearbyLabel = readNearbyText(element);
  if (nearbyLabel) return nearbyLabel;
  if (input.placeholder) return normalizeWhitespace(input.placeholder);
  return normalizeWhitespace(input.name || input.id).replace(/[_-]+/g, ' ');
}

/** Generated ids: UUIDs, long tokens without spaces, or "a_b_c" keys. Never shown as a question. */
export function isMachineId(text: string): boolean {
  // A real question never contains a UUID ("ffc70292-623d-4bf5…", even with spaces for dashes).
  if (/\b[0-9a-f]{8}[\s_-][0-9a-f]{4}[\s_-][0-9a-f]{4}\b/i.test(text)) return true;
  if (/\s/.test(text)) return false;
  // "_systemfield_name" and hash-like tokens are ids; "first_name" is a readable key.
  return /^_/.test(text) || /(?=[0-9a-f]*\d)[0-9a-f]{8,}/i.test(text) || text.length > 40;
}

function readNearbyText(element: Element): string {
  // Fall back to the nearest preceding text inside the field's container.
  let ancestor: Element | null = element;
  for (let depth = 0; ancestor && depth < 4; depth += 1) {
    ancestor = ancestor.parentElement;
    const nearbyText = normalizeWhitespace(
      Array.from(ancestor?.childNodes ?? [])
        .filter((child) => !(child instanceof Element && child.matches('input, textarea, select')))
        .map((child) => child.textContent)
        .join(' '),
    );
    if (nearbyText && nearbyText.length < 400) return nearbyText;
  }
  return '';
}
