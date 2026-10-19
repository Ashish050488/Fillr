// Legal endings and filler that change between postings of the same company.
const COMPANY_SUFFIXES =
  /\b(incorporated|inc|llc|llp|ltd|limited|private|pvt|corp|corporation|company|co|gmbh|plc|ag|sa|bv|nv|pte|pty|srl|the)\b/g;

/** "Globex Inc." and "globex" are one company; "Hitachi Solutions India Pvt Ltd" keeps its name. */
export function companyKey(companyName: string | undefined): string {
  return (companyName ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(COMPANY_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
