import { describe, expect, it } from 'vitest';
import { isFounderNoteSite } from './founder-note-sites';

describe('isFounderNoteSite', () => {
  it('covers Y Combinator, Work at a Startup and Wellfound', () => {
    expect(isFounderNoteSite('https://www.ycombinator.com/companies/eventual/jobs/AeLBWI3')).toBe(true);
    expect(isFounderNoteSite('https://www.workatastartup.com/jobs/94775')).toBe(true);
    expect(isFounderNoteSite('https://wellfound.com/jobs/4844728-software-engineer')).toBe(true);
    expect(isFounderNoteSite('https://angel.co/company/acme/jobs/1')).toBe(true);
  });

  it('leaves ordinary job sites and look-alike hosts alone', () => {
    expect(isFounderNoteSite('https://jobs.lever.co/acme/1')).toBe(false);
    expect(isFounderNoteSite('https://notwellfound.com/jobs')).toBe(false);
    expect(isFounderNoteSite(undefined)).toBe(false);
  });
});
