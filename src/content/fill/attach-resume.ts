import { bestMatch, fieldSignals } from '../form/match-profile-field';
import { notifyChange } from '../form/set-field-value';
import type { Resume } from '../../shared/types';

const PDF_ACCEPT_TYPES = ['.pdf', 'application/pdf', 'application/*', '*/*'];

/** Put your resume PDF into a file field, unless it is a cover-letter upload or refuses PDFs. */
export function attachResume(element: Element, resume?: Resume): boolean {
  const fileInput = element as HTMLInputElement;
  if (!resume?.base64 || fileInput.files?.length) return false;
  // Workday names its upload box generically ("file-upload-input-ref"): a lone file field is the resume.
  const isOnlyUpload = fileInput.ownerDocument.querySelectorAll('input[type="file"]').length === 1;
  if (!isOnlyUpload && bestMatch(fileInput, { resume: 'resume' })?.key !== 'resume') return false;
  if (/cover/.test(fieldSignals(fileInput).join(' '))) return false;
  const acceptedTypes = fileInput.accept
    .toLowerCase()
    .split(',')
    .map((acceptedType) => acceptedType.trim());
  if (fileInput.accept && !acceptedTypes.some((acceptedType) => PDF_ACCEPT_TYPES.includes(acceptedType))) return false;
  const bytes = Uint8Array.from(atob(resume.base64), (character) => character.charCodeAt(0));
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], resume.fileName, { type: 'application/pdf' }));
  fileInput.files = transfer.files;
  notifyChange(fileInput);
  return true;
}
