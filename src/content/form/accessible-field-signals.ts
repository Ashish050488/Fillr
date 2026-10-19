/** Text exposed by labels and accessibility metadata for one form control. */
export function readAccessibleFieldSignals(element: Element): string[] {
  const input = element as HTMLInputElement;
  const root = element.getRootNode?.() as Document | ShadowRoot | undefined;
  const labels = Array.from(input.labels ?? []).map((label) => label.textContent ?? '');
  const id = element.getAttribute('id');
  if (id) {
    labels.push(
      ...Array.from(root?.querySelectorAll?.('label') ?? [])
        .filter((label) => label.getAttribute('for') === id)
        .map((label) => label.textContent ?? ''),
    );
  }
  const referencedText = (attribute: string) =>
    (element.getAttribute(attribute) ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((referenceId) => root?.getElementById?.(referenceId)?.textContent ?? '');
  return [
    ...labels,
    ...referencedText('aria-labelledby'),
    ...referencedText('aria-describedby'),
    element.getAttribute('aria-label') ?? '',
    element.getAttribute('title') ?? '',
    // SmartRecruiters' <spl-input label="LinkedIn"> keeps the label on the shadow host.
    (root as ShadowRoot | undefined)?.host?.getAttribute?.('label') ?? '',
  ];
}

/** Jobright-like forms often keep the profile key on the control or its field wrapper. */
export function readFieldMetadata(element: Element): string[] {
  const metadata: string[] = [];
  let current: Element | null = element;
  for (let depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
    for (const attribute of Array.from(current.attributes ?? [])) {
      if (/^data-field(?:-|$)/i.test(attribute.name)) metadata.push(attribute.value);
    }
  }
  return metadata;
}
