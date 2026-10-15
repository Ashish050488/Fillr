import { describe, expect, it } from 'vitest';
import type { Referral } from '../../shared/types';
import { checkBeforeDrafting, sameCompanyNotice } from './referral-checks';

const NOW = Date.UTC(2026, 9, 16);
const DAY_MILLISECONDS = 86_400_000;
const PROFILE_TEXT = 'Akash Rao\nFounding Engineer at Zudo\n'.repeat(10);
const asked = (overrides: Partial<Referral>): Referral => ({
  id: 'linkedin.com/in/akash',
  profileUrl: 'https://www.linkedin.com/in/akash/',
  personName: 'Akash',
  company: 'Zudo',
  status: 'asked',
  draftedAt: NOW - 3 * DAY_MILLISECONDS,
  askedAt: NOW - 3 * DAY_MILLISECONDS,
  message: 'Hi Akash, would you refer me?',
  ...overrides,
});
const check = (overrides: Partial<Parameters<typeof checkBeforeDrafting>[0]>) =>
  checkBeforeDrafting({
    profileId: 'linkedin.com/in/akash',
    profileText: PROFILE_TEXT,
    goal: 'auto',
    referrals: [],
    now: NOW,
    ...overrides,
  });

describe('checkBeforeDrafting', () => {
  it('refuses your own profile and a profile that has not loaded', () => {
    expect(() => check({ ownProfileId: 'linkedin.com/in/akash' })).toThrow(/your own profile/);
    expect(() => check({ profileText: 'Akash' })).toThrow(/not loaded/);
  });

  it('warns when you already messaged this person', () => {
    expect(check({ referrals: [asked({})] }).notices[0]).toMatch(/already messaged Akash 3 days ago/);
  });

  it('gives a follow-up the earlier message, and warns when it is too soon', () => {
    const result = check({ goal: 'followup', referrals: [asked({})] });
    expect(result.earlierMessage).toEqual({ text: 'Hi Akash, would you refer me?', daysAgo: 3 });
    expect(result.notices.join(' ')).toMatch(/5 to 7 days/);
    expect(() => check({ goal: 'followup' })).toThrow(/no earlier message/);
  });
});

describe('sameCompanyNotice', () => {
  it('warns after two other asks at the same company in two weeks', () => {
    const others = [asked({ id: 'a' }), asked({ id: 'b', company: 'zudo' })];
    expect(sameCompanyNotice(others, 'c', 'Zudo', NOW)).toMatch(/2 other people at Zudo/);
    expect(sameCompanyNotice(others.slice(0, 1), 'c', 'Zudo', NOW)).toBeUndefined();
    expect(sameCompanyNotice(others, 'c', 'Salus', NOW)).toBeUndefined();
  });
});
