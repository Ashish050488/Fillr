import { findComposer, type LinkedInComposer } from './linkedin-composer';

const COMPOSER_WAIT_MILLISECONDS = 5000;
const COMPOSER_CHECK_MILLISECONDS = 150;

/** The "Message" button on the profile you are viewing (it only exists when you can message them). */
function findMessageButton(): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('main button, main a')).find((control) => {
    const label = `${control.getAttribute('aria-label') ?? ''}`.trim();
    const text = (control.textContent ?? '').replace(/\s+/g, ' ').trim();
    return text === 'Message' || /^message\s/i.test(label);
  });
}

/**
 * The open message box, opening it with the profile's Message button if needed (the same click
 * you would make). Undefined when you cannot message them, e.g. not connected yet.
 */
export async function openMessageBox(): Promise<LinkedInComposer | undefined> {
  const openComposer = findComposer();
  if (openComposer) return openComposer;
  const messageButton = findMessageButton();
  if (!messageButton) return undefined;
  messageButton.click();
  const startedAt = Date.now();
  while (Date.now() - startedAt < COMPOSER_WAIT_MILLISECONDS) {
    await new Promise((resolve) => setTimeout(resolve, COMPOSER_CHECK_MILLISECONDS));
    const composer = findComposer();
    if (composer) return composer;
  }
  return undefined;
}
