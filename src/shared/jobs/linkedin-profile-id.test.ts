import { describe, expect, it } from 'vitest';
import { isLinkedInActivityPage, isLinkedInNetworkingPage, linkedInProfileId } from './linkedin-profile-id';

describe('linkedInProfileId', () => {
  it('gives one id for the profile, its activity page and any query', () => {
    expect(linkedInProfileId('https://www.linkedin.com/in/Akash-Rao/')).toBe('linkedin.com/in/akash-rao');
    expect(linkedInProfileId('https://in.linkedin.com/in/akash-rao/recent-activity/all/?x=1')).toBe(
      'linkedin.com/in/akash-rao',
    );
  });

  it('ignores pages that are not a person', () => {
    expect(linkedInProfileId('https://www.linkedin.com/company/zudo/')).toBeUndefined();
    expect(linkedInProfileId('https://www.linkedin.com/jobs/view/123')).toBeUndefined();
    expect(linkedInProfileId('https://evil.com/in/akash')).toBeUndefined();
  });

  it('recognises the posts page', () => {
    expect(isLinkedInActivityPage('https://www.linkedin.com/in/akash-rao/recent-activity/all/')).toBe(true);
    expect(isLinkedInActivityPage('https://www.linkedin.com/in/akash-rao/')).toBe(false);
  });
});

describe('isLinkedInNetworkingPage', () => {
  it('is every LinkedIn page except a job posting', () => {
    expect(isLinkedInNetworkingPage('https://www.linkedin.com/feed/')).toBe(true);
    expect(isLinkedInNetworkingPage('https://www.linkedin.com/in/akash/')).toBe(true);
    expect(isLinkedInNetworkingPage('https://www.linkedin.com/jobs/view/123/')).toBe(false);
    expect(isLinkedInNetworkingPage('https://www.linkedin.com/jobs/search/?currentJobId=9')).toBe(false);
    expect(isLinkedInNetworkingPage('https://jobs.lever.co/acme/1')).toBe(false);
  });
});
