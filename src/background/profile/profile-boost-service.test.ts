import { describe, expect, it } from 'vitest';
import type { ProfilePageField, ProfilePageScan } from '../../shared/types';
import { buildProfileBrief, describeProfileField, toProfileBoost } from './profile-boost-service';

const bioField: ProfilePageField = {
  id: 'field-1',
  label: 'Your bio',
  value: 'Full-Stack Engineer | MERN, AWS, Docker.',
  maxLength: 160,
  kind: 'text',
};
const achievementsField: ProfilePageField = {
  id: 'field-2',
  label: "It's OK to brag",
  section: 'Achievements',
  value: '',
  maxLength: 1000,
  kind: 'text',
};
const scan: ProfilePageScan = {
  url: 'https://wellfound.com/profile/edit/overview',
  site: 'Wellfound',
  pageText: 'Your bio Full-Stack Engineer | MERN, AWS, Docker. Skills Python Javascript Node.js React.js',
  fields: [bioField, achievementsField],
};

describe('describeProfileField', () => {
  it('names the box, shows its text and its limit', () => {
    expect(describeProfileField(bioField)).toBe(
      'Your bio. Current text: "Full-Stack Engineer | MERN, AWS, Docker.". Limit: 160 characters.',
    );
    expect(describeProfileField(achievementsField)).toContain('Achievements: It');
    expect(describeProfileField(achievementsField)).toContain('Currently empty.');
  });
});

describe('buildProfileBrief', () => {
  it('lists target keywords and the ones the page is missing', () => {
    const jobs = [
      { jobTitle: 'Senior Backend Engineer', jobFacts: { skills: ['Node.js', 'TypeScript', 'AWS'] } },
      { jobTitle: 'Backend Engineer', jobFacts: { skills: ['TypeScript', 'PostgreSQL'] } },
    ] as never;
    const brief = buildProfileBrief(scan, jobs);
    expect(brief).toContain('Target roles: Backend Engineer.');
    expect(brief).toContain('Not yet on the page: TypeScript, PostgreSQL.');
    expect(brief).toContain('Page: /profile/edit/overview.');
  });
});

describe('toProfileBoost', () => {
  it('keeps real changes, drops skills already listed and splits tips', () => {
    const boost = toProfileBoost(
      {
        'field-1': 'full-stack engineer | MERN, AWS,  Docker.',
        'field-2': 'Cut daily AI API calls by 65% with caching and key rotation.',
        skillsToAdd: 'TypeScript, Node.js, Docker, PostgreSQL',
        tips: '1. Set years of experience to 1 year\n- Add Backend roles\nAdd a photo\nExtra',
      },
      scan,
      [bioField, achievementsField],
      5,
    );
    expect(boost.suggestions).toEqual([
      {
        fieldId: 'field-2',
        label: 'Achievements',
        current: '',
        suggested: 'Cut daily AI API calls by 65% with caching and key rotation.',
        maxLength: 1000,
      },
    ]);
    expect(boost.skillsToAdd).toEqual(['TypeScript', 'PostgreSQL']);
    expect(boost.tips).toEqual(['Set years of experience to 1 year', 'Add Backend roles', 'Add a photo']);
    expect(boost.page).toBe('/profile/edit/overview');
  });
});
