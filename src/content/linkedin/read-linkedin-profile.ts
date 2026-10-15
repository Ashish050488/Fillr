import { isLinkedInActivityPage, linkedInProfileId } from '../../shared/jobs/linkedin-profile-id';
import type { LinkedInProfileSnapshot } from '../../shared/types';

/**
 * LinkedIn renames its page structure every few weeks, so nothing here depends on class names:
 * the profile is read as the text you see, and the AI picks out role, company and posts from it.
 */
const POSTS_CACHE_PREFIX = 'jobfill_linkedin_posts:';
const MAXIMUM_PAGE_TEXT_LENGTH = 15000;
// Page chrome that adds nothing about the person.
const NOISE_LINES =
  /^(message|follow|connect|more|pending|show all.*|see more|…see more|\d+ (followers|connections)|\d+\+? connections|contact info|open to|add profile section|enhance profile|resources|people also viewed|people you may know|you might like|promoted|ad options)$/i;

function readMainText(): string {
  const main = document.querySelector<HTMLElement>('main') ?? document.body;
  return main.innerText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !NOISE_LINES.test(line))
    .filter((line, lineIndex, lines) => line !== lines[lineIndex - 1])
    .join('\n')
    .slice(0, MAXIMUM_PAGE_TEXT_LENGTH);
}

/** On their activity page, keep the posts for this tab so the profile can use them afterwards. */
export function rememberPostsIfActivityPage(): void {
  const profileId = linkedInProfileId(location.href);
  if (!profileId || !isLinkedInActivityPage(location.href)) return;
  try {
    sessionStorage.setItem(`${POSTS_CACHE_PREFIX}${profileId}`, readMainText());
  } catch {
    /* Storage blocked: the profile text alone still works. */
  }
}

function readRememberedPosts(profileId: string): string | undefined {
  try {
    return sessionStorage.getItem(`${POSTS_CACHE_PREFIX}${profileId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Their name, profile text and (if you opened their activity page in this tab) recent posts. */
export function readProfileSnapshot(): LinkedInProfileSnapshot | undefined {
  const profileId = linkedInProfileId(location.href);
  if (!profileId) return undefined;
  const isActivityPage = isLinkedInActivityPage(location.href);
  const pageText = readMainText();
  const personName =
    (document.querySelector('main h1')?.textContent ?? '').replace(/\s+/g, ' ').trim() ||
    document.title
      .split(/\s[|–-]\s/)[0]
      .replace(/^\(\d+\)\s*/, '')
      .trim();
  return {
    profileUrl: location.href,
    personName,
    profileText: isActivityPage ? `${personName}\n${document.title}` : pageText,
    postsText: isActivityPage ? pageText : readRememberedPosts(profileId),
  };
}
