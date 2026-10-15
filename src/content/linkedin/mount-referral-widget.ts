import type { ContentScriptContext } from 'wxt/client';
import { linkedInProfileId } from '../../shared/jobs/linkedin-profile-id';
import { sendMessageWithin } from '../../shared/messaging/extension-messages';
import { openMessageBox } from './open-message-box';
import { readProfileSnapshot, rememberPostsIfActivityPage } from './read-linkedin-profile';
import { createReferralCard, type DraftReply } from './referral-card';
import { watchReferralSends } from './referral-send-watcher';
import { createReferralWidget } from './referral-widget-markup';

const PAGE_CHECK_MILLISECONDS = 1500;
const AI_REPLY_TIMEOUT_MILLISECONDS = 120_000;
const QUICK_LABEL_RESET_MILLISECONDS = 6000;

/**
 * LinkedIn profiles: "Write referral" reads the profile, writes the message, opens their Message
 * box and puts it in. You read it and press Send. The ▴ button shows options and every draft.
 */
export function mountReferralWidget(context: ContentScriptContext): void {
  const elements = createReferralWidget();
  document.documentElement.append(elements.host);
  // Once the text is in LinkedIn's box, get out of the way so you can read it and press Send.
  const card = createReferralCard(elements, () => {
    setOpen(false);
    setQuickLabel('In the box ✓ press Send', true);
  });
  let draftsProfileId: string | undefined;
  let quickLabelTimer: number | undefined;

  const setOpen = (isOpen: boolean) => {
    elements.card.hidden = !isOpen;
    elements.openButton.setAttribute('aria-expanded', String(isOpen));
  };
  const setQuickLabel = (text: string, isDone = false) => {
    window.clearTimeout(quickLabelTimer);
    elements.quickLabel.textContent = text;
    elements.quickButton.parentElement?.classList.toggle('done', isDone);
    if (isDone)
      quickLabelTimer = window.setTimeout(() => setQuickLabel('Write referral'), QUICK_LABEL_RESET_MILLISECONDS);
  };

  const writeDrafts = async (): Promise<DraftReply | undefined> => {
    const snapshot = readProfileSnapshot();
    if (!snapshot) {
      card.showState('Open someone’s LinkedIn profile first.', true);
      return undefined;
    }
    card.showState(`Reading ${snapshot.personName || 'their profile'} and writing…`);
    try {
      const reply = await sendMessageWithin(
        'REFERRAL_DRAFT',
        { snapshot, jobUrl: card.jobUrl(), goal: card.selectedGoal() },
        AI_REPLY_TIMEOUT_MILLISECONDS,
        'The AI took too long. Try again in a moment.',
      );
      if (!reply.success || !reply.drafts) throw new Error(reply.error ?? 'Could not write the message.');
      draftsProfileId = linkedInProfileId(location.href);
      card.showDrafts(reply);
      elements.writeButton.textContent = 'Rewrite';
      const company = reply.referral?.company ? ` at ${reply.referral.company}` : '';
      const notices = reply.notices?.length ? ` Note: ${reply.notices.join(' ')}` : '';
      card.showState(
        `Written for ${reply.referral?.personName || 'them'}${company}.${notices}`,
        Boolean(reply.notices?.length),
      );
      return reply;
    } catch (error) {
      card.showState(error instanceof Error ? error.message : 'Could not write the message.', true);
      return undefined;
    }
  };

  elements.writeButton.addEventListener('click', async () => {
    elements.writeButton.disabled = true;
    await writeDrafts();
    elements.writeButton.disabled = false;
  });

  // One click: write, open their Message box, put the message in. Sending stays yours.
  elements.quickButton.addEventListener('click', async () => {
    elements.quickButton.disabled = true;
    setQuickLabel('Writing…');
    const reply = await writeDrafts();
    elements.quickButton.disabled = false;
    if (!reply) {
      setQuickLabel('Write referral');
      return setOpen(true);
    }
    const composer = await openMessageBox();
    if (composer && card.insertInto(composer)) {
      setQuickLabel('In the box ✓ press Send', true);
      card.showState('In their message box. Read it over and press Send yourself.');
      if (reply.notices?.length) setOpen(true);
      return;
    }
    // Not connected: no Message button. The short note goes with a connection request.
    await navigator.clipboard.writeText(reply.drafts?.invitationNote ?? '').catch(() => undefined);
    setQuickLabel('Written ✓');
    card.showState(
      'You can’t message them yet. Click Connect, then "Add a note", and press "Put in LinkedIn box". The note is copied too.',
    );
    setOpen(true);
  });

  elements.openButton.addEventListener('click', () => setOpen(elements.card.hidden));
  elements.closeButton.addEventListener('click', () => setOpen(false));
  // Like any popover: a click anywhere else, or Escape, closes it.
  const handleOutsidePointerDown = (event: PointerEvent) => {
    if (!elements.card.hidden && !event.composedPath().includes(elements.host)) setOpen(false);
  };
  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !elements.card.hidden) setOpen(false);
  };
  document.addEventListener('pointerdown', handleOutsidePointerDown, true);
  document.addEventListener('keydown', handleEscapeKey, true);

  const stopWatching = watchReferralSends(() => {
    setQuickLabel('Sent ✓ counted', true);
    card.showState('Sent. Counted as a referral ask in your tracker.');
  });
  // LinkedIn changes pages without reloading: follow the address.
  const followPage = () => {
    const profileId = linkedInProfileId(location.href);
    const shouldHide = !profileId;
    if (elements.host.hidden !== shouldHide) elements.host.hidden = shouldHide;
    if (!elements.host.isConnected) document.documentElement.append(elements.host);
    rememberPostsIfActivityPage();
    if (profileId !== draftsProfileId && card.hasDrafts()) {
      card.reset();
      elements.writeButton.textContent = 'Write message';
      setQuickLabel('Write referral');
    }
  };
  followPage();
  const pageTimer = window.setInterval(followPage, PAGE_CHECK_MILLISECONDS);
  context.onInvalidated(() => {
    window.clearInterval(pageTimer);
    stopWatching();
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
    elements.host.remove();
  });
}
