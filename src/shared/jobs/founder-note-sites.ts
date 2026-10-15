/**
 * Startup job sites where the application is a note read by a founder or hiring contact:
 * Y Combinator (ycombinator.com, Work at a Startup) and Wellfound (formerly AngelList Talent).
 */
const FOUNDER_NOTE_HOST = /(^|\.)(ycombinator\.com|workatastartup\.com|wellfound\.com|angel\.co)$/i;

export function isFounderNoteSite(pageUrl: string | undefined): boolean {
  try {
    return FOUNDER_NOTE_HOST.test(new URL(pageUrl ?? '').hostname);
  } catch {
    return false;
  }
}
