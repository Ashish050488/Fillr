import { bestMatch, fieldSignals } from '../form/match-profile-field';
import { questionLabel } from '../page/question-label';
import { notifyChange } from '../form/set-field-value';
import type { Resume } from '../../shared/types';

const PDF_ACCEPT_TYPES = ['.pdf', 'application/pdf', 'application/*', '*/*'];

/** Every file input on the page, including those inside shadow roots (SmartRecruiters' upload box). */
export function findAllFileInputs(root: Document | ShadowRoot = document): HTMLInputElement[] {
  const fileInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  for (const host of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (host.shadowRoot && host.id !== 'jobfill-panel-host') fileInputs.push(...findAllFileInputs(host.shadowRoot));
  }
  return fileInputs;
}

/** Put your resume PDF into a file field, unless it is a cover-letter upload or refuses PDFs. */
export function attachResume(element: Element, resume?: Resume): boolean {
  const fileInput = element as HTMLInputElement;
  if (!resume?.base64 || fileInput.files?.length) return false;
  // Workday names its upload box generically ("file-upload-input-ref"): a lone file field is the resume.
  const isOnlyUpload = findAllFileInputs(fileInput.ownerDocument).length === 1;
  if (!isOnlyUpload && bestMatch(fileInput, { resume: 'resume' })?.key !== 'resume') return false;
  if (/cover/.test(fieldSignals(fileInput).join(' '))) return false;
  // Ashby's "Autofill from resume" box reruns their parser and overwrites what JobFill typed.
  if (
    !isOnlyUpload &&
    /autofill|auto fill|parse|import/i.test(`${fieldSignals(fileInput).join(' ')} ${questionLabel(fileInput)}`)
  )
    return false;
  const acceptedTypes = fileInput.accept
    .toLowerCase()
    .split(',')
    .map((acceptedType) => acceptedType.trim());
  if (fileInput.accept && !acceptedTypes.some((acceptedType) => PDF_ACCEPT_TYPES.includes(acceptedType))) return false;
  attachResumeFile(fileInput, resume.base64, resume.fileName);
  notifyChange(fileInput);
  return true;
}

/** Put the PDF bytes into the input's file list (the caller fires the change events). */
export function attachResumeFile(fileInput: HTMLInputElement, base64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  attachFile(fileInput, bytes, fileName, 'application/pdf');
}

/** Put any file into the input's file list (the caller fires the change events). */
export function attachFile(fileInput: HTMLInputElement, bytes: Uint8Array, fileName: string, type: string): void {
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], fileName, { type }));
  fileInput.files = transfer.files;
}
