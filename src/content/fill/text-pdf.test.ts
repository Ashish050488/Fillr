import { describe, expect, it } from 'vitest';
import { makeTextPdf, wrapText } from './text-pdf';

describe('wrapText', () => {
  it('wraps at word boundaries and keeps blank lines between paragraphs', () => {
    expect(wrapText('one two three\n\nfour', 8)).toEqual(['one two', 'three', '', 'four']);
  });

  it('replaces typographic quotes and dashes Helvetica cannot show', () => {
    expect(wrapText('It’s “good” — really')).toEqual(['It\'s "good" - really']);
  });
});

describe('makeTextPdf', () => {
  it('writes a PDF whose cross-reference offsets point at each object', () => {
    const bytes = makeTextPdf('Dear Hiring Team,\n\nI build (fast) things.');
    const pdf = String.fromCharCode(...bytes);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('(I build \\(fast\\) things.) Tj');
    const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
    offsets.forEach((offset, objectIndex) =>
      expect(pdf.slice(offset).startsWith(`${objectIndex + 1} 0 obj`)).toBe(true),
    );
  });
});
