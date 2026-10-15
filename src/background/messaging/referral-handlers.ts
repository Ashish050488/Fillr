import { linkedInProfileId } from '../../shared/jobs/linkedin-profile-id';
import { getLinkedInCoach } from '../referrals/linkedin-coach-service';
import { draftReferral } from '../referrals/referral-draft-service';
import { deleteReferral, markReferralAsked, setReferralStatus } from '../referrals/referral-store';
import { describeError, isExtensionPage, type RegisterMessageHandler } from './message-registrar';

const REFERRAL_STATUSES = ['drafted', 'asked', 'replied', 'referred', 'declined'] as const;
const CHANNELS = ['message', 'invitation', 'email'] as const;
const GOALS = ['auto', 'referral', 'job', 'advice', 'followup'] as const;
const MAXIMUM_TEXT_LENGTH = 20000;

const isLinkedInTab = (sender: chrome.runtime.MessageSender) =>
  Boolean(sender.tab?.url && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(sender.tab.url));

/** Referral messages: written on a LinkedIn tab, counted when you send them, edited in the panel. */
export function registerReferralHandlers(handle: RegisterMessageHandler): void {
  handle('REFERRAL_DRAFT', async (payload, sender) => {
    if (!isLinkedInTab(sender)) return { success: false, error: 'Open a LinkedIn profile first.' };
    const snapshot = payload?.snapshot;
    if (!snapshot || typeof snapshot.profileText !== 'string' || !linkedInProfileId(String(snapshot.profileUrl)))
      return { success: false, error: 'This page is not a LinkedIn profile.' };
    try {
      const jobUrl =
        typeof payload.jobUrl === 'string' && /^https?:\/\//.test(payload.jobUrl) ? payload.jobUrl : undefined;
      const { drafts, referral, notices } = await draftReferral(
        {
          profileUrl: String(snapshot.profileUrl),
          personName: String(snapshot.personName ?? '').slice(0, 120),
          profileText: snapshot.profileText.slice(0, MAXIMUM_TEXT_LENGTH),
          postsText:
            typeof snapshot.postsText === 'string' ? snapshot.postsText.slice(0, MAXIMUM_TEXT_LENGTH) : undefined,
        },
        jobUrl?.slice(0, 2000),
        GOALS.find((goal) => goal === payload.goal) ?? 'auto',
      );
      return { success: true, drafts, referral, notices };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'Could not write the message.') };
    }
  });

  handle('REFERRAL_MARK_ASKED', async (payload, sender) => {
    if (!isLinkedInTab(sender) && !isExtensionPage(sender)) return { success: false, error: 'Not allowed' };
    const profileId = linkedInProfileId(String(payload?.profileUrl ?? ''));
    const channel = CHANNELS.find((candidate) => candidate === payload?.channel);
    if (!profileId || !channel) return { success: false, error: 'Unknown profile.' };
    const referral = await markReferralAsked(profileId, channel, payload.message);
    return referral ? { success: true, referral } : { success: false, error: 'Write a message for this person first.' };
  });

  handle('REFERRAL_UPDATE', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Not allowed' };
    const status = REFERRAL_STATUSES.find((candidate) => candidate === payload?.status);
    if (!status) return { success: false, error: 'Unknown status.' };
    return { success: await setReferralStatus(String(payload.id), status) };
  });

  // Today's who-to-reach-out-to suggestions, for the side panel on LinkedIn.
  handle('LINKEDIN_COACH', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Not allowed' };
    try {
      return { success: true, coach: await getLinkedInCoach(Boolean(payload?.refresh)) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'Could not get suggestions.') };
    }
  });

  handle('REFERRAL_DELETE', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Not allowed' };
    await deleteReferral(String(payload?.id ?? ''));
    return { success: true };
  });
}
