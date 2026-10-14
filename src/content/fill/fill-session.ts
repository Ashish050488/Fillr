const HIGHLIGHT_MILLISECONDS = 1800;

/** Fields already attempted on this page, so automatic passes never fight the person. */
export const attemptedFields = new WeakSet<Element>();

/** A pencil-like outline that fades, so you can see what was touched. */
function highlightField(element: Element): void {
  const field = element as HTMLElement;
  const previousShadow = field.style.boxShadow;
  field.style.transition = 'box-shadow 400ms ease';
  field.style.boxShadow = '0 0 0 2px #000';
  window.setTimeout(() => {
    field.style.boxShadow = previousShadow;
  }, HIGHLIGHT_MILLISECONDS);
}

/** What one fill has done so far: filled fields, and the text intended for each. */
export class FillSession {
  readonly filledFields = new Set<Element>();
  readonly intendedValues = new Map<Element, string>();

  markFilled(field: Element, intendedValue?: string): void {
    this.filledFields.add(field);
    highlightField(field);
    if (intendedValue !== undefined) this.intendedValues.set(field, intendedValue);
  }

  isFilled(field: Element): boolean {
    return this.filledFields.has(field);
  }
}
