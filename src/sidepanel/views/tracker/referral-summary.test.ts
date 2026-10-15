import { describe, expect, it } from 'vitest';
import type { Referral } from '../../../shared/types';
import { isFollowUpDue, summarizeReferrals } from './referral-summary';

const NOW = Date.UTC(2026, 9, 16);
const DAY_MILLISECONDS = 86_400_000;
const referral = (overrides: Partial<Referral>): Referral => ({
  id: overrides.id ?? `linkedin.com/in/${Math.random()}`,
  profileUrl: 'https://www.linkedin.com/in/someone/',
  personName: 'Someone',
  status: 'asked',
  draftedAt: NOW - DAY_MILLISECONDS,
  askedAt: NOW - DAY_MILLISECONDS,
  ...overrides,
});

describe('summarizeReferrals', () => {
  it('counts asks per company and leaves unsent drafts out', () => {
    const summary = summarizeReferrals(
      [
        referral({ company: 'Zudo' }),
        referral({ company: 'zudo', status: 'referred' }),
        referral({ company: 'Salus', askedAt: NOW - 10 * DAY_MILLISECONDS }),
        referral({ company: 'Acme', status: 'drafted' }),
      ],
      NOW,
    );
    expect(summary.askedCount).toBe(3);
    expect(summary.askedThisWeekCount).toBe(2);
    expect(summary.referredCount).toBe(1);
    expect(summary.companies).toEqual([
      { company: 'Zudo', askedCount: 2, referredCount: 1 },
      { company: 'Salus', askedCount: 1, referredCount: 0 },
    ]);
  });

  it('groups people whose company was not found', () => {
    expect(summarizeReferrals([referral({})], NOW).companies[0].company).toBe('Company unknown');
  });
});

describe('isFollowUpDue', () => {
  it('is due a week after asking with no reply, at most twice', () => {
    expect(isFollowUpDue(referral({ askedAt: NOW - 7 * DAY_MILLISECONDS }), NOW)).toBe(true);
    expect(isFollowUpDue(referral({ askedAt: NOW - 2 * DAY_MILLISECONDS }), NOW)).toBe(false);
    expect(isFollowUpDue(referral({ askedAt: NOW - 9 * DAY_MILLISECONDS, status: 'replied' }), NOW)).toBe(false);
    expect(isFollowUpDue(referral({ askedAt: NOW - 30 * DAY_MILLISECONDS, followUpCount: 2 }), NOW)).toBe(false);
    expect(
      isFollowUpDue(referral({ askedAt: NOW - 30 * DAY_MILLISECONDS, lastContactAt: NOW - DAY_MILLISECONDS }), NOW),
    ).toBe(false);
  });
});
