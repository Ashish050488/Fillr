import { describe, expect, it } from 'vitest';
import { isProfileEditPage, profileEditSite, profilePageKey } from './profile-pages';

describe('profileEditSite', () => {
  it('knows the Wellfound profile editor', () => {
    expect(profileEditSite('https://wellfound.com/profile/edit/overview')).toBe('Wellfound');
    expect(isProfileEditPage('https://wellfound.com/profile/edit/culture')).toBe(true);
  });
  it('ignores job pages and other sites', () => {
    expect(isProfileEditPage('https://wellfound.com/jobs/123-backend')).toBe(false);
    expect(isProfileEditPage('https://example.com/profile/edit')).toBe(false);
    expect(isProfileEditPage(undefined)).toBe(false);
  });
});

describe('profilePageKey', () => {
  it('keeps one key per editor page', () => {
    expect(profilePageKey('https://wellfound.com/profile/edit/overview/?tab=1')).toBe(
      'Wellfound /profile/edit/overview',
    );
  });
});
