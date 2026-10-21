import { describe, expect, it } from 'vitest';
import { findJobSlugInQuery, pickJobLink } from './posting-url';

const JUNIOR = 'https://wellfound.com/jobs/4480240-junior-software-engineer';
const INTERN = 'https://wellfound.com/jobs/4480241-software-engineering-intern';

describe('findJobSlugInQuery', () => {
  it('reads the open job from the list address', () => {
    expect(findJobSlugInQuery('?job_listing_slug=4480240-junior-software-engineer')).toBe(
      '4480240-junior-software-engineer',
    );
    expect(findJobSlugInQuery('?remote=true&role=software-engineer')).toBeUndefined();
  });
});

describe('pickJobLink', () => {
  it('picks the link titled like the open job, not the company’s other openings', () => {
    const links = [
      { href: INTERN, text: 'Software Engineering Intern' },
      { href: JUNIOR, text: ' Junior Software Engineer ' },
    ];
    expect(pickJobLink(links, ['Taskwiser', 'Junior Software Engineer'])).toBe(JUNIOR);
  });

  it('trusts an untitled link only when it is the only job link', () => {
    expect(pickJobLink([{ href: JUNIOR, text: 'View job' }], ['Taskwiser'])).toBe(JUNIOR);
    const twoLinks = [
      { href: JUNIOR, text: 'Apply' },
      { href: INTERN, text: 'Apply' },
    ];
    expect(pickJobLink(twoLinks, ['Taskwiser'])).toBeUndefined();
  });
});
