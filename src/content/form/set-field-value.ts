import { normalise } from './match-profile-field';

export function nativeSet(element: Element, property: string, value: string | boolean): void {
  let prototype = Object.getPrototypeOf(element);
  while (prototype) {
    const setter = Object.getOwnPropertyDescriptor(prototype, property)?.set;
    if (setter) {
      setter.call(element, value);
      return;
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  throw new Error('This field does not support automatic filling.');
}

export function notifyChange(element: Element): void {
  const EventConstructor = element.ownerDocument.defaultView?.Event ?? Event;
  element.dispatchEvent(new EventConstructor('input', { bubbles: true, composed: true }));
  element.dispatchEvent(new EventConstructor('change', { bubbles: true, composed: true }));
  // Some frameworks (Workday, Formik) validate and commit only on blur.
  const FocusConstructor = element.ownerDocument.defaultView?.FocusEvent ?? FocusEvent;
  element.dispatchEvent(new FocusConstructor('blur', { bubbles: false }));
  element.dispatchEvent(new FocusConstructor('focusout', { bubbles: true, composed: true }));
}

export function fillElement(element: Element, value: string): boolean {
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    if (['file', 'password', 'hidden', 'submit', 'button', 'reset', 'image'].includes(input.type)) return false;
    if (input.readOnly || input.disabled) return false;
    if (input.type === 'radio') {
      const choice = [input.value, ...Array.from(input.labels ?? []).map((label) => label.textContent ?? '')];
      if (input.checked || !choice.some((text) => normalise(text) === normalise(value))) return false;
      const group = Array.from(input.ownerDocument.getElementsByName(input.name));
      if (group.some((member) => member.tagName === 'INPUT' && (member as HTMLInputElement).checked)) return false;
      nativeSet(input, 'checked', true);
    } else if (input.type === 'checkbox') {
      // Never consent, subscribe, or accept terms on the person's behalf.
      if (input.checked || !/^(yes|true)$/i.test(value)) return false;
      nativeSet(input, 'checked', true);
    } else {
      if (input.value.trim()) return false;
      if (input.type === 'number' && !/^-?\d+(\.\d+)?$/.test(value)) return false;
      nativeSet(input, 'value', fitLength(value, input.maxLength));
    }
  } else if (element.tagName === 'TEXTAREA') {
    const input = element as HTMLTextAreaElement;
    if (input.value.trim() || input.readOnly || input.disabled) return false;
    nativeSet(input, 'value', fitLength(value, input.maxLength));
  } else if (element.tagName === 'SELECT') {
    const select = element as HTMLSelectElement;
    if (select.disabled || (select.value && select.selectedIndex > 0)) return false;
    const matches = Array.from(select.options).filter(
      (option) =>
        !option.disabled &&
        [option.value, option.textContent ?? ''].some((text) => normalise(text) === normalise(value)),
    );
    if (matches.length !== 1) return false;
    nativeSet(select, 'value', matches[0].value);
  } else if ((element as HTMLElement).isContentEditable) {
    if (element.textContent?.trim()) return false;
    element.textContent = value;
  } else return false;
  notifyChange(element);
  return true;
}

/** Trim to the field's maxlength at a sentence or word boundary, never mid-word. */
export function fitLength(value: string, maxLength: number): string {
  if (!(maxLength > 0) || value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const sentence = cut.lastIndexOf('. ');
  if (sentence >= maxLength * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut).trim();
}
