import type { MessageMap, OutreachGoal, ReferralChannel, ReferralDrafts } from '../../shared/types';
import { findComposer, writeIntoComposer, type LinkedInComposer } from './linkedin-composer';
import { rememberFilledComposer, reportAsked, watchDraft } from './referral-send-watcher';
import type { ReferralWidgetElements } from './referral-widget-markup';

const INVITATION_NOTE_LIMIT = 200;
type DraftTab = 'message' | 'invitationNote' | 'email';
const CHANNEL_BY_TAB: Record<DraftTab, ReferralChannel> = {
  message: 'message',
  invitationNote: 'invitation',
  email: 'email',
};
export type DraftReply = MessageMap['REFERRAL_DRAFT']['response'];

/** The card's drafts, tabs and buttons. Writing and the quick button live in the widget. */
export function createReferralCard(elements: ReferralWidgetElements, onInserted: () => void) {
  let drafts: ReferralDrafts | undefined;
  let activeTab: DraftTab = 'message';
  let selectedGoal: OutreachGoal = 'auto';

  const showState = (text: string, isError = false) => {
    elements.state.textContent = text;
    elements.state.classList.toggle('err', isError);
  };
  const textForTab = (tab: DraftTab) =>
    !drafts
      ? ''
      : tab === 'email'
        ? drafts.emailBody
        : tab === 'invitationNote'
          ? drafts.invitationNote
          : drafts.message;
  const updateCount = () => {
    const length = elements.draftBox.value.length;
    const isNote = activeTab === 'invitationNote';
    elements.characterCount.textContent = isNote ? `${length}/${INVITATION_NOTE_LIMIT}` : `${length} characters`;
    elements.characterCount.classList.toggle('over', isNote && length > INVITATION_NOTE_LIMIT);
  };
  const showTab = (tab: DraftTab) => {
    activeTab = tab;
    elements.tabButtons.forEach((button) => button.classList.toggle('on', button.dataset.tab === tab));
    elements.draftBox.value = textForTab(tab);
    elements.gmailButton.hidden = tab !== 'email';
    // Email shows its subject line; Gmail replaces "Put in LinkedIn box" there.
    elements.insertButton.hidden = tab === 'email';
    elements.subjectRow.hidden = tab !== 'email' || !drafts?.emailSubject;
    elements.subject.textContent = drafts?.emailSubject ?? '';
    updateCount();
  };
  // What JobFill made of them, so you can catch a wrong read before you send.
  const showInsight = (written: ReferralDrafts) => {
    elements.insight.hidden = !written.persona && !written.angle;
    elements.insight.replaceChildren();
    if (written.persona) {
      const persona = document.createElement('b');
      persona.textContent = `${written.persona}.`;
      elements.insight.append(persona);
    }
    if (written.angle) elements.insight.append(written.angle);
    elements.insight.classList.remove('expanded');
  };
  elements.insight.addEventListener('click', () => elements.insight.classList.toggle('expanded'));

  elements.goalButtons.forEach((button) =>
    button.addEventListener('click', () => {
      selectedGoal = button.dataset.goal as OutreachGoal;
      elements.goalButtons.forEach((goalButton) => {
        const isOn = goalButton === button;
        goalButton.classList.toggle('on', isOn);
        goalButton.setAttribute('aria-checked', String(isOn));
      });
      elements.optionsSummary.textContent = `Ask for: ${(button.textContent ?? '').toLowerCase()}`;
    }),
  );
  elements.copySubjectButton.addEventListener('click', () => {
    void navigator.clipboard.writeText(drafts?.emailSubject ?? '').then(() => showState('Subject copied.'));
  });
  elements.tabButtons.forEach((button) =>
    button.addEventListener('click', () => showTab(button.dataset.tab as DraftTab)),
  );
  elements.draftBox.addEventListener('input', () => {
    if (!drafts) return;
    if (activeTab === 'email') drafts.emailBody = elements.draftBox.value;
    else drafts[activeTab] = elements.draftBox.value;
    watchDraft(location.href, [drafts.message, drafts.invitationNote]);
    updateCount();
  });

  /** Puts the right version in the box: the short note for a connection request, else the message. */
  const insertInto = (composer: LinkedInComposer): boolean => {
    const text = composer.channel === 'invitation' ? (drafts?.invitationNote ?? '') : (drafts?.message ?? '');
    // A free message to an Open Profile has a Subject line: it gets the email subject.
    if (!text || !writeIntoComposer(composer, text, drafts?.emailSubject)) return false;
    rememberFilledComposer(composer);
    return true;
  };
  elements.insertButton.addEventListener('click', () => {
    const composer = findComposer();
    if (!composer) {
      void navigator.clipboard.writeText(elements.draftBox.value).catch(() => undefined);
      return showState(
        'No message box is open. Click Message (or Connect, then "Add a note") and press this again. Copied it for you too.',
        true,
      );
    }
    if (!insertInto(composer)) return showState('LinkedIn did not take the text. Press Copy and paste it.', true);
    showState('In the box. Read it over, then press Send yourself. JobFill counts it when you do.');
    onInserted();
  });
  elements.copyButton.addEventListener('click', () => {
    void navigator.clipboard
      .writeText(elements.draftBox.value)
      .then(() => showState('Copied.'))
      .catch(() => showState('Could not copy. Select the text and copy it.', true));
  });
  elements.gmailButton.addEventListener('click', () => {
    const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(drafts?.emailSubject ?? '')}&body=${encodeURIComponent(elements.draftBox.value)}`;
    window.open(composeUrl, '_blank', 'noopener');
    showState('Opened a Gmail draft. Add their email, send it, then press "I sent it" below.');
  });
  elements.sentButton.addEventListener('click', async () => {
    const reply = await reportAsked(location.href, CHANNEL_BY_TAB[activeTab], elements.draftBox.value).catch(
      () => undefined,
    );
    showState(
      reply?.success
        ? 'Counted as a referral ask. See it under Tracker → Referrals.'
        : (reply?.error ?? 'Could not count it.'),
      !reply?.success,
    );
  });

  return {
    showState,
    insertInto,
    selectedGoal: () => selectedGoal,
    jobUrl: () => elements.jobLinkInput.value.trim() || undefined,
    hasDrafts: () => Boolean(drafts),
    showDrafts(reply: DraftReply) {
      drafts = reply.drafts;
      if (!drafts) return;
      watchDraft(location.href, [drafts.message, drafts.invitationNote]);
      elements.result.hidden = false;
      showInsight(drafts);
      showTab(activeTab);
    },
    reset() {
      drafts = undefined;
      elements.result.hidden = true;
      showState('');
    },
  };
}
