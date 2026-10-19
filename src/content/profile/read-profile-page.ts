import { profileEditSite } from '../../shared/jobs/profile-pages';
import type { ProfilePageField, ProfilePageScan } from '../../shared/types';
import { normalizeWhitespace, questionLabel, SENSITIVE } from '../page/question-label';

/** Every box on a profile editor page that JobFill may rewrite, stamped so it can write back. */

export const PROFILE_FIELD_ATTRIBUTE = 'data-jobfill-profile-field';
const BOX_SELECTOR = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"]';
// Single-line boxes worth rewriting; names, links, locations and titles stay as you typed them.
const REWRITABLE_LINE = /\b(headline|tagline|bio|summary|about|pitch|looking for|one.?liner)\b/i;
const SKILLS_BOX = /\bskills?\b/i;
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, label, legend';
const MAXIMUM_PAGE_TEXT = 20000;
const MAXIMUM_FIELDS = 30;
const MAXIMUM_CONTEXT_INPUTS = 4;
let fieldCount = 0;

type ProfileBox = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const boxValue = (box: ProfileBox) =>
  'value' in box && typeof box.value === 'string' ? box.value : (box.textContent ?? '');
const isVisible = (box: Element) => box.getClientRects().length > 0 && !box.closest('[aria-hidden="true"]');
const precedes = (first: Node, second: Node) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

/** A label without the required star or the "characters left" number beside it. */
const cleanLabel = (text: string | null | undefined) =>
  normalizeWhitespace(text)
    .replace(/\s*\d{1,4}$/, '')
    .replace(/\s*\*$/, '');

/** The closest heading above the box, e.g. "Achievements" over a box whose label is its placeholder. */
export function sectionHeading(box: Element): string | undefined {
  let ancestor = box.parentElement;
  for (let depth = 0; ancestor && depth < 8; depth += 1, ancestor = ancestor.parentElement) {
    const headings = Array.from(ancestor.querySelectorAll(HEADING_SELECTOR)).filter(
      (heading) => precedes(heading, box) && !heading.contains(box),
    );
    const text = cleanLabel(headings[headings.length - 1]?.textContent);
    if (text && text.length <= 80) return text;
  }
  return undefined;
}

/**
 * The limit from the box, or from a "characters left" counter beside it: Wellfound shows "3"
 * next to a 157-character bio, so the limit is 160.
 */
export function characterLimit(box: ProfileBox): number | undefined {
  const declared = (box as HTMLInputElement).maxLength;
  if (declared > 0) return declared;
  let ancestor = box.parentElement;
  for (let depth = 0; ancestor && depth < 3; depth += 1, ancestor = ancestor.parentElement) {
    const counter = Array.from(ancestor.querySelectorAll('span, div, p, small')).find(
      (element) =>
        !element.children.length && !element.contains(box) && /^\d{1,4}$/.test(element.textContent?.trim() ?? ''),
    );
    if (counter) return Number(counter.textContent) + boxValue(box).length;
  }
  return undefined;
}

/**
 * The title and company in a small form around the box, so a work experience box knows which job
 * it is. A whole profile form (name, links, pronouns) is not context and is never sent.
 */
function formContext(box: Element): string | undefined {
  const form = box.closest('[role="dialog"], form');
  const inputs = Array.from(form?.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])') ?? []);
  if (!inputs.length || inputs.length > MAXIMUM_CONTEXT_INPUTS) return undefined;
  const values = inputs
    .filter(
      (input) => input.value.trim() && !/^https?:/i.test(input.value.trim()) && !SENSITIVE.test(questionLabel(input)),
    )
    .map((input) => input.value.trim());
  return values.length ? values.join(' · ').slice(0, 200) : undefined;
}

/** A new id, skipping any left on the page by an earlier copy of this script. */
function nextFieldId(): string {
  do fieldCount += 1;
  while (document.querySelector(`[${PROFILE_FIELD_ATTRIBUTE}="field-${fieldCount}"]`));
  return `field-${fieldCount}`;
}

function readBox(box: ProfileBox): ProfilePageField | undefined {
  if (!isVisible(box) || (box as HTMLInputElement).disabled || (box as HTMLInputElement).readOnly) return undefined;
  const label = cleanLabel(questionLabel(box));
  const section = sectionHeading(box);
  const description = `${label} ${section ?? ''}`;
  if (SENSITIVE.test(label) && !SKILLS_BOX.test(description)) return undefined;
  const isSkills = box.tagName === 'INPUT' && SKILLS_BOX.test(description) && !REWRITABLE_LINE.test(label);
  if (box.tagName === 'INPUT' && !isSkills && !REWRITABLE_LINE.test(description)) return undefined;
  const id = box.getAttribute(PROFILE_FIELD_ATTRIBUTE) || nextFieldId();
  box.setAttribute(PROFILE_FIELD_ATTRIBUTE, id);
  return {
    id,
    label: label.slice(0, 400),
    section: section && section !== label ? section.slice(0, 120) : undefined,
    context: box.tagName === 'TEXTAREA' ? formContext(box) : undefined,
    value: isSkills ? '' : boxValue(box).slice(0, 5000),
    maxLength: isSkills ? undefined : characterLimit(box),
    kind: isSkills ? 'skills' : 'text',
  };
}

/** Reads the profile editor you are on: its text and every box JobFill may rewrite. */
export function readProfilePage(): ProfilePageScan {
  const boxes = Array.from(document.querySelectorAll<ProfileBox>(BOX_SELECTOR));
  const fields = boxes
    .map((box) => readBox(box))
    .filter((field): field is ProfilePageField => Boolean(field))
    .slice(0, MAXIMUM_FIELDS);
  return {
    url: location.href,
    site: profileEditSite(location.href) ?? location.hostname.replace(/^www\./, ''),
    pageText: normalizeWhitespace(document.body.innerText).slice(0, MAXIMUM_PAGE_TEXT),
    fields,
  };
}
