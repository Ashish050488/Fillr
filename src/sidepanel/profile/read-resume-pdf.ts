import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Resume } from '../../shared/types';

export async function readResume(file: File): Promise<Resume> {
  if (!/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF resume.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await import('pdfjs-dist');
  pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = pdf.getDocument({ data: bytes.slice() });
  try {
    const document = await task.promise;
    const pages: string[] = [];
    const links = new Set<string>();
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      // Keep line breaks: they separate sections and dates for the parser.
      pages.push(
        content.items
          .map((textItem) => ('str' in textItem ? textItem.str + (textItem.hasEOL ? '\n' : ' ') : ''))
          .join('')
          .replace(/[ \t]+/g, ' '),
      );
      // Hyperlinks such as "LinkedIn" or "GitHub" are often annotations, invisible in the text layer.
      for (const annotation of await page.getAnnotations()) {
        const url =
          (annotation as { url?: string; unsafeUrl?: string }).url ?? (annotation as { unsafeUrl?: string }).unsafeUrl;
        if (annotation.subtype === 'Link' && typeof url === 'string' && url.length < 500) links.add(url);
      }
    }
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'application/pdf',
      uploadDate: new Date().toISOString(),
      base64: btoa(binary),
      plainText: pages.join('\n') + (links.size ? `\nLinks in this resume: ${[...links].join(' ')}` : ''),
      links: [...links],
    };
  } finally {
    await task.destroy();
  }
}
