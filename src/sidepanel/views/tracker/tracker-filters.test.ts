import { describe, expect, it } from 'vitest';
import type { Job } from '../../../shared/types';
import { applicationFollowUp, matchesFilter } from './tracker-filters';

const NOW = Date.UTC(2026, 9, 16);
const DAY_MILLISECONDS = 86_400_000;
const job = (status: Job['status'], daysAgo: number): Job => ({
  id: '1',
  url: 'https://jobs.lever.co/acme/1',
  date: '',
  timestamp: NOW - daysAgo * DAY_MILLISECONDS,
  appliedAt: NOW - daysAgo * DAY_MILLISECONDS,
  status,
  fieldsFilled: 0,
});

describe('applicationFollowUp', () => {
  it('nudges after 8 days and calls it a silent no after 45', () => {
    expect(applicationFollowUp(job('applied', 3), NOW)).toBeUndefined();
    expect(applicationFollowUp(job('applied', 9), NOW)).toBe('due');
    expect(applicationFollowUp(job('applied', 50), NOW)).toBe('silent');
  });

  it('leaves applications that already moved on alone', () => {
    expect(applicationFollowUp(job('interview', 20), NOW)).toBeUndefined();
    expect(applicationFollowUp(job('rejected', 60), NOW)).toBeUndefined();
  });

  it('has its own filter', () => {
    expect(matchesFilter(job('applied', 10), 'Follow up')).toBe(true);
    expect(matchesFilter(job('applied', 2), 'Follow up')).toBe(false);
  });
});
