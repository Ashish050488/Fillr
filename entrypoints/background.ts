import { registerBackgroundHandlers } from '../src/background/messaging/register-background-handlers';
import { startProfileBackup } from '../src/background/profile/profile-backup-service';

export default defineBackground(() => {
  const storageReady = Promise.resolve().then(() =>
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  );
  registerBackgroundHandlers(storageReady);
  void storageReady.then(() => startProfileBackup()).catch(() => undefined);

  // The toolbar icon opens the side panel, where all of JobFill lives.
  chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  chrome.runtime.onInstalled?.addListener((details) => {
    if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    // Chrome leaves the previous version's scripts orphaned in open tabs ("Extension context
    // invalidated"). Re-inject so open applications work without a manual refresh.
    if (details.reason === 'update' || details.reason === 'install') void reinjectOpenTabs();
  });

  // Alt+Shift+F: autofill the current tab, injecting the content script if the page predates install.
  chrome.commands?.onCommand.addListener(async (command, tab) => {
    if (command !== 'autofill' || tab?.id == null) return;
    const message = { action: 'FILL_FORM', payload: { ai: true } };
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scripts/content.js'] });
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        /* Restricted pages such as chrome:// cannot be filled. */
      }
    }
  });
});

async function reinjectOpenTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.all(
      tabs.map((tab) =>
        tab.id == null || tab.discarded
          ? undefined
          : chrome.scripting
              .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content-scripts/content.js'] })
              .catch(() => undefined),
      ),
    );
  } catch {
    /* Some tabs (store pages, PDFs) never accept scripts. */
  }
}
