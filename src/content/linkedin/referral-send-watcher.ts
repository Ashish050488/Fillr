import { sendMessage } from '../../shared/messaging/extension-messages';
import type { ReferralChannel } from '../../shared/types';
import { findComposer, readComposerText, type LinkedInComposer } from './linkedin-composer';

/**
 * You press Send yourself; JobFill only notices it. A Send counts as a referral ask when the box
 * holds the message JobFill wrote for this person (even after your edits).
 */
const SEND_LABEL = /^(send|send now|send invitation|send without a note)$/i;
const MATCHING_PREFIX_LENGTH = 24;
const ENTER_SEND_CHECK_MILLISECONDS = 700;

interface WatchedDraft {
  profileUrl: string;
  texts: string[];
}

let watchedDraft: WatchedDraft | undefined;
const filledComposers = new WeakSet<HTMLElement>();

export function watchDraft(profileUrl: string, texts: string[]): void {
  watchedDraft = { profileUrl, texts: texts.filter(Boolean) };
}

export function rememberFilledComposer(composer: LinkedInComposer): void {
  filledComposers.add(composer.element);
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

function holdsOurDraft(composer: LinkedInComposer, draft: WatchedDraft): boolean {
  if (filledComposers.has(composer.element)) return true;
  const typedText = normalize(readComposerText(composer));
  return draft.texts.some((text) => typedText.includes(normalize(text).slice(0, MATCHING_PREFIX_LENGTH)));
}

export function reportAsked(profileUrl: string, channel: ReferralChannel, message?: string) {
  return sendMessage('REFERRAL_MARK_ASKED', { profileUrl, channel, message });
}

export function watchReferralSends(onAsked: (channel: ReferralChannel) => void): () => void {
  const handleSend = () => {
    const draft = watchedDraft;
    const composer = findComposer();
    if (!draft || !composer || !readComposerText(composer).trim() || !holdsOurDraft(composer, draft)) return;
    const sentText = readComposerText(composer);
    watchedDraft = undefined;
    void reportAsked(draft.profileUrl, composer.channel, sentText)
      .then((reply) => reply.success && onAsked(composer.channel))
      .catch(() => undefined);
  };
  const handleClick = (event: MouseEvent) => {
    const button = (event.target as Element | null)?.closest?.('button');
    const label = `${button?.textContent ?? ''} ${button?.getAttribute('aria-label') ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
    if (button && (SEND_LABEL.test(label) || SEND_LABEL.test(button.getAttribute('aria-label') ?? ''))) handleSend();
  };
  // LinkedIn can send on Enter, or Enter can just add a line: it was sent only if the box then empties.
  const handleKey = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || !(event.target as HTMLElement | null)?.isContentEditable) return;
    const draft = watchedDraft;
    const composer = findComposer();
    if (!draft || !composer || !holdsOurDraft(composer, draft)) return;
    const textBefore = readComposerText(composer);
    window.setTimeout(() => {
      if (readComposerText(composer).trim() || watchedDraft !== draft) return;
      watchedDraft = undefined;
      void reportAsked(draft.profileUrl, composer.channel, textBefore)
        .then((reply) => reply.success && onAsked(composer.channel))
        .catch(() => undefined);
    }, ENTER_SEND_CHECK_MILLISECONDS);
  };
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKey, true);
  return () => {
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKey, true);
  };
}
