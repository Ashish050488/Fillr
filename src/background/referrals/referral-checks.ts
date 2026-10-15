import type { OutreachGoal, Referral } from '../../shared/types';

const MINIMUM_PROFILE_TEXT_LENGTH = 150;
const SAME_COMPANY_WINDOW_MILLISECONDS = 14 * 86_400_000;
const SAME_COMPANY_ASK_LIMIT = 2;
const FOLLOW_UP_WAIT_DAYS = 5;
const MAXIMUM_FOLLOW_UPS = 2;
const DAY_MILLISECONDS = 86_400_000;

export interface DraftCheckInput {
  profileId: string;
  ownProfileId?: string;
  profileText: string;
  goal: OutreachGoal;
  referrals: Referral[];
  now?: number;
}

export interface DraftCheckResult {
  notices: string[];
  /** For a follow-up: what you sent first and how long ago. */
  earlierMessage?: { text: string; daysAgo: number };
}

const daysSince = (timestamp: number, now: number) => Math.max(0, Math.floor((now - timestamp) / DAY_MILLISECONDS));
const formatDays = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

/**
 * What to stop or warn about before writing: your own profile, a page that has not loaded,
 * someone you already asked, too many asks at one company, and follow-ups that come too soon.
 * Throws for things that make no sense to write; returns notices for things you should know.
 */
export function checkBeforeDrafting(input: DraftCheckInput): DraftCheckResult {
  const now = input.now ?? Date.now();
  if (input.ownProfileId && input.profileId === input.ownProfileId)
    throw new Error('This is your own profile. Open the profile of the person you want to message.');
  if (input.profileText.replace(/\s+/g, ' ').trim().length < MINIMUM_PROFILE_TEXT_LENGTH)
    throw new Error(
      'Their profile has not loaded yet. Scroll down once so LinkedIn shows their experience, then try again.',
    );
  const notices: string[] = [];
  const existing = input.referrals.find((referral) => referral.id === input.profileId);
  const wasAsked = Boolean(existing && existing.status !== 'drafted');
  const lastContact = existing?.lastContactAt ?? existing?.askedAt;

  if (input.goal === 'followup') {
    if (!existing?.message || !wasAsked || !lastContact)
      throw new Error('There is no earlier message to follow up on. Choose another "Ask for" option.');
    const daysAgo = daysSince(lastContact, now);
    if (existing.status !== 'asked')
      notices.push(`They already ${existing.status} to you. A follow-up may not be needed.`);
    if ((existing.followUpCount ?? 0) >= MAXIMUM_FOLLOW_UPS)
      notices.push(
        `You have followed up ${existing.followUpCount} times. More than two usually hurts more than it helps.`,
      );
    if (daysAgo < FOLLOW_UP_WAIT_DAYS)
      notices.push(`You wrote ${formatDays(daysAgo)}. Waiting 5 to 7 days before a follow-up works better.`);
    return { notices, earlierMessage: { text: existing.message, daysAgo } };
  }

  if (wasAsked && lastContact)
    notices.push(
      `You already messaged ${existing!.personName || 'them'} ${formatDays(daysSince(lastContact, now))}. To nudge them, choose "Ask for: a follow-up".`,
    );
  return { notices };
}

/** Asking several people at one company at once can look like spam: warn after two in two weeks. */
export function sameCompanyNotice(
  referrals: Referral[],
  profileId: string,
  company: string | undefined,
  now = Date.now(),
): string | undefined {
  const companyKey = company?.trim().toLowerCase();
  if (!companyKey) return undefined;
  const recentAsksAtCompany = referrals.filter(
    (referral) =>
      referral.id !== profileId &&
      referral.status !== 'drafted' &&
      referral.company?.trim().toLowerCase() === companyKey &&
      (referral.askedAt ?? 0) > now - SAME_COMPANY_WINDOW_MILLISECONDS,
  ).length;
  if (recentAsksAtCompany < SAME_COMPANY_ASK_LIMIT) return undefined;
  return `You asked ${recentAsksAtCompany} other people at ${company} in the last two weeks. Several asks at once can look like spam; consider waiting for replies.`;
}
