import { defineContentScript } from 'wxt/sandbox';
import { registerFrameHooks } from '../src/content/fill/page-scan';
import { watchSubmissions } from '../src/content/tracking/submission-watcher';
import { mountWidget } from '../src/content/widget/mount-widget';
import { sendMessage } from '../src/shared/messaging/extension-messages';

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
    mountWidget(context);
  },
});
