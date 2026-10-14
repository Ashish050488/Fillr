const BULLET_MARK = /^[\s•●▪◦·*\-–—]+/;
// A sentence ends at ". " before a capital letter, but not after "e.g." or "approx." and similar.
const SENTENCE_BREAK = /(?<!\b(?:e\.g|i\.e|etc|approx|vs|incl|no|mr|ms|dr))\.\s+(?=[A-Z])/g;
const MINIMUM_POINT_LENGTH = 3;

/**
 * Splits a resume description into readable points: the resume's own bullets or line breaks
 * when it has them, otherwise one point per sentence.
 */
export function splitIntoPoints(description: string): string[] {
  const lines = description
    .split(/\n|\s[•●▪◦]\s/)
    .map((line) => line.replace(BULLET_MARK, '').trim())
    .filter((line) => line.length >= MINIMUM_POINT_LENGTH);
  const points = lines.length > 1 ? lines : description.replace(BULLET_MARK, '').split(SENTENCE_BREAK);
  return points.map((point) => point.trim().replace(/\.$/, '')).filter((point) => point.length >= MINIMUM_POINT_LENGTH);
}
