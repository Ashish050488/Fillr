import { describe, expect, it } from 'vitest';
import { buildYcJobBrief, isYcJobUrl } from './yc-job-brief';

// Trimmed from a real ycombinator.com job page's data.
const pageProps = {
  company: {
    name: 'Eventual',
    batch_name: 'W22',
    one_liner: 'Building the AI data engine for any modality and scale',
    hiring_description: '# **About Eventual**\r\nEvery breakthrough AI application relies on processing video.',
    team_size: 20,
    location: 'San Francisco',
    founders: [
      { full_name: 'Jay Chia', title: null, founder_bio: 'Jay worked in ML infrastructure at Lyft L5.' },
      { full_name: 'Gone Founder', is_active: false, founder_bio: 'Left.' },
    ],
  },
  job: {
    title: 'Research Engineer, Multimodal Data',
    location: 'San Francisco, CA, US',
    salaryRange: '$180K - $250K',
    visa: 'US citizen/visa only',
    minExperience: 'Any (new grads ok)',
    skills: [{ name: 'Python' }, 'Rust'],
    hiringManager: { first_name: 'Jay', last_name: 'Chia' },
    description: '## **The role**\nBuild [Daft](https://getdaft.io) pipelines.',
  },
};

describe('buildYcJobBrief', () => {
  it('keeps the company, founders, who reads the note and the job together', () => {
    const jobBrief = buildYcJobBrief(pageProps)!;
    expect(jobBrief.title).toBe('Research Engineer, Multimodal Data');
    expect(jobBrief.company).toBe('Eventual');
    expect(jobBrief.brief).toContain('Eventual (Y Combinator W22): Building the AI data engine');
    expect(jobBrief.brief).toContain('Your note goes to: Jay Chia');
    expect(jobBrief.brief).toContain('* Jay Chia: Jay worked in ML infrastructure at Lyft L5.');
    expect(jobBrief.brief).not.toContain('Gone Founder');
    expect(jobBrief.brief).toContain('Skills: Python, Rust');
    expect(jobBrief.brief).toContain('The role\nBuild Daft pipelines.');
    expect(jobBrief.brief).not.toMatch(/\*\*|#/);
  });

  it('ignores pages that are not a YC job', () => {
    expect(buildYcJobBrief({ company: { name: 'Eventual' } })).toBeUndefined();
    expect(buildYcJobBrief(undefined)).toBeUndefined();
  });

  it('recognises YC and Work at a Startup addresses only', () => {
    expect(isYcJobUrl('https://www.ycombinator.com/companies/eventual/jobs/AeLBWI3')).toBe(true);
    expect(isYcJobUrl('https://www.workatastartup.com/jobs/94775')).toBe(true);
    expect(isYcJobUrl('https://notycombinator.com/jobs')).toBe(false);
    expect(isYcJobUrl('not a url')).toBe(false);
  });
});
