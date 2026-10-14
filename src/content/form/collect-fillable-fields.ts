export type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
export function collectFillables(
  root: Document | ShadowRoot | Element = document,
  seen = new Set<Element>(),
): Fillable[] {
  const fillableFields: Fillable[] = [];
  // Workday and similar ATSs render dropdowns as buttons that open a listbox.
  const controls = root.querySelectorAll<Fillable>(
    'input, textarea, select, [contenteditable="true"], button[aria-haspopup="listbox"]',
  );
  for (const control of Array.from(controls)) {
    if (
      seen.has(control) ||
      control.closest('#jobfill-panel-host') ||
      control.hasAttribute('disabled') ||
      control.hasAttribute('readonly')
    )
      continue;
    if (
      control.tagName === 'INPUT' &&
      ['password', 'search', 'submit', 'button', 'reset', 'image', 'hidden'].includes(
        (control as HTMLInputElement).type,
      )
    )
      continue;
    if (control.closest('[hidden], [aria-hidden="true"]') || control.getClientRects().length === 0 || isTrap(control))
      continue;
    seen.add(control);
    fillableFields.push(control);
  }
  for (const host of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (host.shadowRoot && host.id !== 'jobfill-panel-host')
      fillableFields.push(...collectFillables(host.shadowRoot, seen));
  }
  for (const frame of Array.from(root.querySelectorAll('iframe'))) {
    try {
      if (frame.contentDocument) fillableFields.push(...collectFillables(frame.contentDocument, seen));
    } catch {
      /* cross-origin frames are inaccessible */
    }
  }
  return fillableFields;
}

const TRAP_NAME =
  /honeypot|hp[_-]?(field|check)|leave[\s_-]*(this[\s_-]*)?(blank|empty)|do[\s_-]*not[\s_-]*fill|bot[_-]?(field|check|trap)|^(url|website|fax)_?2$|confirm_email_address_hp/i;

/**
 * Spam-trap fields that people never see: invisible via CSS, pushed off-screen, tiny, or
 * named as traps. Real applicants leave them empty, so JobFill must too.
 */
export function isTrap(control: Element): boolean {
  const element = control as HTMLElement;
  const signals = `${element.getAttribute('name') ?? ''} ${element.id} ${element.getAttribute('autocomplete') ?? ''} ${element.getAttribute('aria-label') ?? ''}`;
  if (TRAP_NAME.test(signals) || (element.getAttribute('autocomplete') === 'off' && element.tabIndex === -1))
    return true;
  const view = element.ownerDocument.defaultView;
  // Real radios, checkboxes and uploads are routinely hidden behind custom-styled labels.
  if (!view || ['radio', 'checkbox', 'file'].includes(element.getAttribute('type') ?? '')) return false;
  for (let node: HTMLElement | null = element, depth = 0; node && depth < 4; node = node.parentElement, depth += 1) {
    const style = view.getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return true;
  }
  const box = element.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return element.getAttribute('type') !== 'file'; // File inputs are often visually hidden behind a button.
  return box.right < -500 || box.bottom < -500 || box.left > view.innerWidth + 2000;
}
