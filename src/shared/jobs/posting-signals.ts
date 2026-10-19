/**
 * Quick facts about a posting read from the page, no AI: how old it is, whether it was reposted,
 * how many applied, whether pay is listed and whether it still takes applications. Postings open
 * for 30 to 60+ days, reposted, or with no pay range are the common signs of a "ghost job".
 */
export interface PostingSignal {
  label: string;
  tone: 'good' | 'info' | 'warning';
}

const DAYS_PER_UNIT: Record<string, number> = { minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 };
const OLD_POSTING_DAYS = 30;
const VERY_OLD_POSTING_DAYS = 60;
const MANY_APPLICANTS = 200;

// "Posted 3 weeks ago", "Reposted 2 months ago", Workday's "Posted 30+ Days Ago".
const AGE_PATTERN = /\b(?:posted|reposted|published)?:?\s*(\d+)(\+?)\s*(minute|hour|day|week|month|year)s?\s+ago\b/i;
const JUST_POSTED_PATTERN = /\b(just posted|posted today|posted just now)\b/i;
const YESTERDAY_PATTERN = /\b(?:re)?posted yesterday\b/i;
const REPOSTED_PATTERN = /\breposted\b/i;
// "Over 200 applicants", "97 applicants", "100 people clicked apply", Naukri's "Applicants: 120".
const APPLICANTS_PATTERN =
  /\b(over\s+)?(\d[\d,]*)(\+?)\s+(?:applicants|people (?:clicked apply|applied))\b|\bapplicants:\s*(\d[\d,]*)(\+?)/i;
const CLOSED_PATTERN =
  /\b(no longer accepting applications|this job (?:is|has) (?:closed|expired)|position (?:has been )?filled)\b/i;
const EARLY_PATTERN = /\b(be an early applicant|actively (?:hiring|recruiting|reviewing applicants))\b/i;
const PAY_PATTERN =
  /([$€£₹¥]\s?\d|\d\s?(?:k|lpa|lakhs?|cr)\b|\b(?:salary|compensation|pay range|ctc|stipend|base pay)\b[^.\n]{0,40}\d|\b\d{2,3}[,.]?\d{3}\s*(?:usd|eur|gbp|inr)\b)/i;

/** Signals for one posting, most important first. */
export function readPostingSignals(pageText: string): PostingSignal[] {
  const text = pageText.slice(0, 30000);
  const signals: PostingSignal[] = [];
  if (CLOSED_PATTERN.test(text)) signals.push({ label: 'No longer taking applications', tone: 'warning' });

  const ageMatch = text.match(AGE_PATTERN);
  const isReposted = REPOSTED_PATTERN.test(text);
  const postedWord = isReposted ? 'Reposted' : 'Posted';
  if (ageMatch) {
    const [, amount, plus, unit] = ageMatch;
    const ageInDays = Number(amount) * DAYS_PER_UNIT[unit.toLowerCase()];
    const ageLabel = `${postedWord} ${amount}${plus} ${unit.toLowerCase()}${amount === '1' && !plus ? '' : 's'} ago`;
    const tone = ageInDays >= OLD_POSTING_DAYS ? 'warning' : ageInDays <= 7 ? 'good' : 'info';
    signals.push({ label: ageInDays >= VERY_OLD_POSTING_DAYS ? `${ageLabel}: may be a ghost job` : ageLabel, tone });
  } else if (YESTERDAY_PATTERN.test(text)) {
    signals.push({ label: `${postedWord} yesterday`, tone: 'good' });
  } else if (JUST_POSTED_PATTERN.test(text)) {
    signals.push({ label: `${postedWord} today`, tone: 'good' });
  } else if (isReposted) {
    signals.push({ label: 'Reposted', tone: 'warning' });
  }

  const applicantMatch = text.match(APPLICANTS_PATTERN);
  if (applicantMatch) {
    const countText = applicantMatch[2] ?? applicantMatch[4];
    // Only "over 200" or "200+" is a lower bound; "97 applicants" is exact.
    const isLowerBound = Boolean(applicantMatch[1] || applicantMatch[3] || applicantMatch[5]);
    const applicantCount = Number(countText.replace(/,/g, ''));
    signals.push({
      label: `${countText}${isLowerBound ? '+' : ''} applicants${applicantCount >= MANY_APPLICANTS ? ': a referral helps here' : ''}`,
      tone: applicantCount >= MANY_APPLICANTS ? 'warning' : 'info',
    });
  }
  if (EARLY_PATTERN.test(text)) signals.push({ label: 'Early or actively hiring', tone: 'good' });
  signals.push(
    PAY_PATTERN.test(text) ? { label: 'Pay listed', tone: 'good' } : { label: 'No pay range', tone: 'info' },
  );
  return signals;
}
