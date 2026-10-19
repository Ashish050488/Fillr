/**
 * CSS lookups that reach inside open shadow roots. A recipe selector can name the path explicitly
 * with " >>> " ("spl-dropzone >>> input[type=file]"); without it, every shadow root is searched.
 */
const SHADOW_STEP = ' >>> ';

type QueryRoot = Document | ShadowRoot | Element;

/** Every element matching the selector, searching through open shadow roots. */
export function deepQueryAll<ElementType extends Element = HTMLElement>(
  selector: string,
  root: QueryRoot = document,
): ElementType[] {
  const matches = Array.from(root.querySelectorAll<ElementType>(selector));
  for (const host of Array.from(root.querySelectorAll('*'))) {
    if (host.shadowRoot && host.id !== 'jobfill-panel-host')
      matches.push(...deepQueryAll<ElementType>(selector, host.shadowRoot));
  }
  return matches;
}

/** Follow "host >>> inner" steps: each step is searched deeply inside the previous match's shadow root. */
export function queryRecipeSelector<ElementType extends Element = HTMLElement>(
  selector: string,
  root: QueryRoot = document,
): ElementType | undefined {
  const [firstStep, ...laterSteps] = selector.split(SHADOW_STEP);
  let candidates: Element[] = deepQueryAll(firstStep ?? '', root);
  for (const step of laterSteps) {
    candidates = candidates.flatMap((host) => deepQueryAll(step, host.shadowRoot ?? host));
  }
  return candidates[0] as ElementType | undefined;
}

/** The first selector in the list that finds something. */
export function queryFirst<ElementType extends Element = HTMLElement>(
  selectors: string[],
  root: QueryRoot = document,
): ElementType | undefined {
  for (const selector of selectors) {
    try {
      const found = queryRecipeSelector<ElementType>(selector, root);
      if (found) return found;
    } catch {
      // An invalid selector in one recipe must not break the others.
    }
  }
  return undefined;
}
