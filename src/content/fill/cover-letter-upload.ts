import type { FormQuestion } from '../../shared/types';
import { fieldSignals } from '../form/match-profile-field';
import { notifyChange } from '../form/set-field-value';
import { questionLabel } from '../page/question-label';
import { attachFile, findAllFileInputs } from './attach-resume';
import type { FillSession } from './fill-session';
import { makeTextPdf } from './text-pdf';

/** Asked of the AI when the form wants the cover letter as a file, not typed in a box. */
export const COVER_LETTER_FILE_QUESTION: FormQuestion = { id: 'coverLetterFile', label: 'Cover letter', kind: 'long' };

const COVER_LETTER = /cover|motivation(al)? letter|anschreiben/i;

/** Empty file inputs that ask for a cover letter. */
export function findCoverLetterUploads(): HTMLInputElement[] {
  return findAllFileInputs().filter(
    (fileInput) =>
      !fileInput.files?.length && COVER_LETTER.test(`${questionLabel(fileInput)} ${fieldSignals(fileInput).join(' ')}`),
  );
}

/** Turn the letter into "Name - Cover Letter.pdf" and put it in every cover-letter upload. */
export function attachCoverLetterPdf(
  uploads: HTMLInputElement[],
  letter: string,
  session: FillSession,
  fileNamePrefix?: string,
): number {
  if (!letter.trim()) return 0;
  const bytes = makeTextPdf(letter);
  const fileName = `${fileNamePrefix ? `${fileNamePrefix} - ` : ''}Cover Letter.pdf`;
  let attachedCount = 0;
  for (const upload of uploads) {
    if (upload.accept && !/pdf|application\/\*|\*\/\*/i.test(upload.accept)) continue;
    attachFile(upload, bytes, fileName, 'application/pdf');
    notifyChange(upload);
    session.markFilled(upload);
    attachedCount += 1;
  }
  return attachedCount;
}
