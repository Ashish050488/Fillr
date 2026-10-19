/**
 * Job-site pages where you edit your own candidate profile. On these JobFill rewrites the profile
 * so recruiters searching the site find you, instead of filling an application.
 */
const PROFILE_EDIT_PAGES = [
  { site: 'Wellfound', host: /(^|\.)(wellfound\.com|angel\.co)$/i, path: /^\/profile\/edit/i },
];

/** The site name when the address is a profile editor, e.g. "Wellfound"; otherwise undefined. */
export function profileEditSite(pageUrl: string | undefined): string | undefined {
  try {
    const { hostname, pathname } = new URL(pageUrl ?? '');
    return PROFILE_EDIT_PAGES.find((page) => page.host.test(hostname) && page.path.test(pathname))?.site;
  } catch {
    return undefined;
  }
}

export const isProfileEditPage = (pageUrl: string | undefined) => Boolean(profileEditSite(pageUrl));

/** One saved rewrite per site and editor page ("Wellfound /profile/edit/overview"). */
export function profilePageKey(pageUrl: string): string {
  try {
    const { pathname } = new URL(pageUrl);
    return `${profileEditSite(pageUrl) ?? 'site'} ${pathname.replace(/\/+$/, '').toLowerCase()}`;
  } catch {
    return pageUrl;
  }
}
