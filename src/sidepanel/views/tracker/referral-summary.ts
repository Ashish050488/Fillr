import type { Referral, ReferralStatus } from '../../../shared/types';

const MILLISECONDS_PER_WEEK = 7 * 86_400_000;
const FOLLOW_UP_AFTER_MILLISECONDS = 6 * 86_400_000;
const MAXIMUM_FOLLOW_UPS = 2;

/** No reply after about a week, and fewer than two follow-ups so far. */
export function isFollowUpDue(referral: Referral, now = Date.now()): boolean {
  const lastContact = referral.lastContactAt ?? referral.askedAt;
  return (
    referral.status === 'asked' &&
    (referral.followUpCount ?? 0) < MAXIMUM_FOLLOW_UPS &&
    lastContact !== undefined &&
    now - lastContact >= FOLLOW_UP_AFTER_MILLISECONDS
  );
}

/** Statuses you can pick for a sent request ("Drafted" is only before you send it). */
export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  drafted: 'Not sent yet',
  asked: 'Asked',
  replied: 'Replied',
  referred: 'Referred',
  declined: 'Declined',
};

export interface CompanyReferrals {
  company: string;
  askedCount: number;
  referredCount: number;
}

export interface ReferralSummary {
  askedCount: number;
  askedThisWeekCount: number;
  referredCount: number;
  companies: CompanyReferrals[];
}

const companyName = (referral: Referral) => referral.company?.trim() || 'Company unknown';

/** How many people you asked, how many referred you, and at which companies (most asked first). */
export function summarizeReferrals(referrals: Referral[], now = Date.now()): ReferralSummary {
  const sentReferrals = referrals.filter((referral) => referral.status !== 'drafted');
  const companies = new Map<string, CompanyReferrals>();
  for (const referral of sentReferrals) {
    const name = companyName(referral);
    // "Zudo" and "zudo" are one company.
    const companyKey = name.toLowerCase();
    const entry = companies.get(companyKey) ?? { company: name, askedCount: 0, referredCount: 0 };
    entry.askedCount += 1;
    if (referral.status === 'referred') entry.referredCount += 1;
    companies.set(companyKey, entry);
  }
  return {
    askedCount: sentReferrals.length,
    askedThisWeekCount: sentReferrals.filter(
      (referral) => (referral.askedAt ?? referral.draftedAt) > now - MILLISECONDS_PER_WEEK,
    ).length,
    referredCount: sentReferrals.filter((referral) => referral.status === 'referred').length,
    companies: [...companies.values()].sort((first, second) => second.askedCount - first.askedCount),
  };
}
