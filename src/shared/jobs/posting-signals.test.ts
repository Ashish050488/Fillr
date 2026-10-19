import { describe, expect, it } from 'vitest';
import { readPostingSignals } from './posting-signals';

const labels = (text: string) => readPostingSignals(text).map((signal) => `${signal.tone}:${signal.label}`);

describe('readPostingSignals', () => {
  it('flags an old, reposted posting with many applicants and no pay', () => {
    expect(labels('Backend Engineer · Bengaluru · Reposted 2 months ago · Over 200 applicants')).toEqual([
      'warning:Reposted 2 months ago: may be a ghost job',
      'warning:200+ applicants: a referral helps here',
      'info:No pay range',
    ]);
  });

  it('marks a fresh posting with pay as good', () => {
    expect(labels('Posted 3 days ago. 45 applicants. Be an early applicant. Salary: $120,000 - $150,000')).toEqual([
      'good:Posted 3 days ago',
      'info:45 applicants',
      'good:Early or actively hiring',
      'good:Pay listed',
    ]);
  });

  it('reads Indian pay formats and closed postings', () => {
    expect(labels('CTC 18 LPA. No longer accepting applications')).toEqual([
      'warning:No longer taking applications',
      'good:Pay listed',
    ]);
  });

  it('reads Workday, Naukri and logged-in LinkedIn wording', () => {
    expect(labels('Posted 30+ Days Ago')[0]).toBe('warning:Posted 30+ days ago');
    expect(labels('Posted: 3 days ago | Openings: 2 | Applicants: 120')).toContain('info:120 applicants');
    expect(labels('Over 100 people clicked apply · Actively reviewing applicants')).toEqual([
      'info:100+ applicants',
      'good:Early or actively hiring',
      'info:No pay range',
    ]);
    expect(labels('Just posted')[0]).toBe('good:Posted today');
  });

  it('reads minutes, years and yesterday', () => {
    expect(labels('Posted 15 minutes ago')[0]).toBe('good:Posted 15 minutes ago');
    expect(labels('Reposted 1 year ago')[0]).toBe('warning:Reposted 1 year ago: may be a ghost job');
    expect(labels('Posted yesterday')[0]).toBe('good:Posted yesterday');
  });

  it('notices a repost without a date', () => {
    expect(labels('This role was reposted')[0]).toBe('warning:Reposted');
  });
});
