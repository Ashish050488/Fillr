import type { Resume } from '../../shared/types';
import { isWorkday, sectionHeadingOf, wait } from './workday-page';

const CHECK_INTERVAL_MILLISECONDS = 300;
const CHECK_ATTEMPTS = 10;

async function waitUntil(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < CHECK_ATTEMPTS && !condition(); attempt += 1) await wait(CHECK_INTERVAL_MILLISECONDS);
}

/**
 * Workday's Resume/CV dropzone hides its file input (data-automation-id="file-upload-input-ref").
 * The file is set on that input and a change event fired; if Workday does not show the file,
 * the same file is dropped on the zone. Cover-letter dropzones are never touched.
 */
export async function attachWorkdayResume(resume: Resume | undefined): Promise<Element | undefined> {
  if (!isWorkday() || !resume?.base64) return undefined;
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]')).filter(
    (fileInput) => !fileInput.disabled,
  );
  const isCoverLetterUpload = (fileInput: HTMLInputElement) => /cover/i.test(sectionHeadingOf(fileInput));
  const resumeInput =
    fileInputs.find(
      (fileInput) => /resume|\bcv\b|curriculum/i.test(sectionHeadingOf(fileInput)) && !isCoverLetterUpload(fileInput),
    ) ?? (fileInputs.length === 1 && !isCoverLetterUpload(fileInputs[0]) ? fileInputs[0] : undefined);
  if (!resumeInput) return undefined;

  const uploadZone =
    resumeInput.closest('[data-automation-id^="formField"]') ??
    resumeInput.parentElement?.parentElement ??
    resumeInput.parentElement;
  const isShown = () => (uploadZone?.textContent ?? '').includes(resume.fileName);
  if (isShown()) return resumeInput; // Already uploaded on this page.

  const bytes = Uint8Array.from(atob(resume.base64), (character) => character.charCodeAt(0));
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], resume.fileName, { type: 'application/pdf' }));
  resumeInput.files = transfer.files;
  resumeInput.dispatchEvent(new Event('input', { bubbles: true }));
  resumeInput.dispatchEvent(new Event('change', { bubbles: true }));
  await waitUntil(isShown);
  if (!isShown()) {
    const dropZone =
      uploadZone?.querySelector<HTMLElement>('[data-automation-id="file-upload-drop-zone"]') ??
      (uploadZone as HTMLElement | null);
    for (const eventType of ['dragenter', 'dragover', 'drop']) {
      dropZone?.dispatchEvent(new DragEvent(eventType, { bubbles: true, cancelable: true, dataTransfer: transfer }));
    }
    await waitUntil(isShown);
  }
  return isShown() ? resumeInput : undefined;
}
