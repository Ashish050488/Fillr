import { defineContentScript } from 'wxt/sandbox';
import { registerFrameHooks } from '../src/content/fill/page-scan';
import { watchSubmissions } from '../src/content/tracking/submission-watcher';
import { mountReferralWidget } from '../src/content/linkedin/mount-referral-widget';
import { mountWidget } from '../src/content/widget/mount-widget';
import { registerProfilePageHandlers } from '../src/content/profile/write-profile-page';
import { isProfileEditPage } from '../src/shared/jobs/profile-pages';
import { onMessage, sendMessage } from '../src/shared/messaging/extension-messages';
import { scanPage } from '../src/content/fill/page-scan';

type PageWindow = Window & { __jobfill_alive?: () => boolean };

export default defineContentScript({
  matches: ['<all_urls>'],
  // Many careers pages embed the application form (Greenhouse, Lever, Workable) in an iframe.
  allFrames: true,
  main(context) {
    if (window.top !== window) {
      registerFrameHooks();
      // Embedded application form: the background resolves the job from the tab's URL.
      const stopWatching = watchSubmissions(() => {
        void sendMessage('MARK_JOB_APPLIED', { frame: true, auto: true }).catch(() => undefined);
      });
      context.onInvalidated(stopWatching);
      return;
    }
    // After an update Chrome re-injects this script; skip if a live copy is already running.
    const pageWindow = window as PageWindow;
    if (pageWindow.__jobfill_alive?.()) return;
    pageWindow.__jobfill_alive = () => {
      try {
        return Boolean(chrome.runtime.id);
      } catch {
        return false;
      }
    };
    // The panel can rewrite your profile on any site it knows; single-page sites navigate without a reload.
    registerProfilePageHandlers();
    // Your own profile editor is not an application: no Fill now there.
    if (isProfileEditPage(location.href)) return;
    // On LinkedIn you only ask for referrals: the referral widget replaces Fill now there.
    if (/(^|\.)linkedin\.com$/i.test(location.hostname)) {
      mountReferralWidget(context);
      // The panel still checks your fit on LinkedIn job postings; it only needs the page read.
      onMessage('SCAN_PAGE', async () => ({ success: true, scan: await scanPage() }));
    } else mountWidget(context);
  },
});
