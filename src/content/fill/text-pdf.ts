/**
 * A plain, readable A4 PDF from text (a cover letter), built by hand so the content script needs no
 * library. Helvetica 11pt, wrapped to the page, as many pages as the text needs.
 */
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 64;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
// Helvetica averages about half the font size per character.
const CHARACTERS_PER_LINE = Math.floor((PAGE_WIDTH - 2 * MARGIN) / (FONT_SIZE * 0.5));
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT);

/** Typographic characters Helvetica's standard encoding lacks, as their plain equivalents. */
function toPlainCharacters(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/[^\n\x20-\x7e\xa0-\xff]/g, '');
}

/** Wrap each paragraph at word boundaries; a blank line stays blank. */
export function wrapText(text: string, width = CHARACTERS_PER_LINE): string[] {
  const lines: string[] = [];
  for (const paragraph of toPlainCharacters(text).replace(/\r/g, '').split('\n')) {
    let currentLine = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (currentLine && currentLine.length + 1 + word.length > width) {
        lines.push(currentLine);
        currentLine = word;
      } else currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
    lines.push(currentLine);
  }
  return lines;
}

const escapePdfText = (line: string) => line.replace(/[\\()]/g, (character) => `\\${character}`);

function pageStream(lines: string[]): string {
  const textLines = lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join('\n');
  return `BT /F1 ${FONT_SIZE} Tf ${LINE_HEIGHT} TL ${MARGIN} ${PAGE_HEIGHT - MARGIN} Td\n${textLines}\nET`;
}

/** The PDF file's bytes. Every character is one byte (Latin-1), so string offsets are byte offsets. */
export function makeTextPdf(text: string): Uint8Array {
  const lines = wrapText(text);
  const pages: string[][] = [];
  for (let start = 0; start < Math.max(lines.length, 1); start += LINES_PER_PAGE)
    pages.push(lines.slice(start, start + LINES_PER_PAGE));

  // Objects: 1 catalog, 2 page tree, 3 font, then a page and its content stream per page.
  const pageObjectNumber = (pageIndex: number) => 4 + pageIndex * 2;
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_page, pageIndex) => `${pageObjectNumber(pageIndex)} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  pages.forEach((pageLines, pageIndex) => {
    const stream = pageStream(pageLines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageObjectNumber(pageIndex) + 1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((objectBody, objectIndex) => {
    offsets.push(pdf.length);
    pdf += `${objectIndex + 1} 0 obj\n${objectBody}\nendobj\n`;
  });
  const crossReferenceOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF\n`;
  return Uint8Array.from(pdf, (character) => character.charCodeAt(0));
}
