/** Questions JobFill never asks AI to answer: demographics, identity numbers and non-questions. */
export const SENSITIVE =
  /\b(gender|sex|race|ethnic|hispanic|latino|veteran|disab|sexual orientation|transgender|pronoun|religio|date of birth|birth ?date|social security|ssn|criminal|convict|captcha|password|search)\b/i;

export const normalizeWhitespace = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** Human-readable question text for a control, as an applicant would read it. */
export function questionLabel(element: Element): string {
  const input = element as HTMLInputElement;
  if (input.type === 'radio') {
    const group = element.closest('fieldset, [role="radiogroup"], [role="group"]');
    const legend = group?.querySelector('legend, [id$="label"], label:not(:has(input))');
    if (legend) return normalizeWhitespace(legend.textContent).slice(0, 400);
  }
  const root = element.getRootNode() as Document | ShadowRoot;
  const labelParts = [
    ...Array.from(input.labels ?? []).map((label) => label.textContent),
    ...(element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((labelId) => root.getElementById?.(labelId)?.textContent),
    element.getAttribute('aria-label'),
    input.placeholder,
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);
  if (labelParts.length) return [...new Set(labelParts)].join(' — ').slice(0, 400);
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
  return normalizeWhitespace(input.name || input.id).replace(/[_-]+/g, ' ');
}
