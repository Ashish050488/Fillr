const PROFILE_PATH = /^\/in\/([^/?#]+)/i;

/**
 * One id per person: "linkedin.com/in/akash-rao", whether you are on their profile, their
 * activity page or a localised address. Undefined for any page that is not a profile.
 */
export function linkedInProfileId(pageUrl: string): string | undefined {
  try {
    const url = new URL(pageUrl);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return undefined;
    const slug = url.pathname.match(PROFILE_PATH)?.[1];
    return slug ? `linkedin.com/in/${decodeURIComponent(slug).toLowerCase()}` : undefined;
  } catch {
    return undefined;
  }
}

/** True on someone's posts page (/in/{slug}/recent-activity/…), where their recent posts are listed. */
export function isLinkedInActivityPage(pageUrl: string): boolean {
  try {
    return /^\/in\/[^/]+\/recent-activity\//i.test(new URL(pageUrl).pathname);
  } catch {
    return false;
  }
}

/** Any LinkedIn page except a job posting (where checking your fit still makes sense). */
export function isLinkedInNetworkingPage(pageUrl: string): boolean {
  try {
    const url = new URL(pageUrl);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return false;
    return !/^\/jobs\/view\//i.test(url.pathname) && !url.searchParams.has('currentJobId');
  } catch {
    return false;
  }
}
