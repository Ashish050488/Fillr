import type { MessageMap, PageScan } from '../../shared/types';

export interface ActiveTab {
  id: number;
  url: string;
  title: string;
}

export async function activeTab(): Promise<ActiveTab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id == null || !tab.url) return undefined;
  return { id: tab.id, url: tab.url, title: tab.title ?? '' };
}

/** Opens a page in the tab you are looking at (e.g. a LinkedIn search), not in a new tab. */
export async function openInCurrentTab(url: string): Promise<void> {
  const tab = await activeTab();
  if (tab) await chrome.tabs.update(tab.id, { url });
  else await chrome.tabs.create({ url });
}

export function isFillable(url: string): boolean {
  return /^https?:/i.test(url) && !/^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/i.test(url);
}

function send<T>(tabId: number, message: { action: string; payload?: unknown }): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: T) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(response);
    });
  });
}

/** Message the page, injecting the content script first if the tab predates the install. */
export async function toPage<T>(tabId: number, message: { action: string; payload?: unknown }): Promise<T> {
  try {
    return await send<T>(tabId, message);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/Receiving end does not exist|Could not establish connection/i.test(error.message)
    )
      throw error;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/content.js'] });
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    return send<T>(tabId, message);
  }
}

export async function scanTab(tabId: number): Promise<PageScan> {
  const response = await toPage<MessageMap['SCAN_PAGE']['response']>(tabId, { action: 'SCAN_PAGE' });
  if (!response?.success || !response.scan)
    throw new Error(response?.error ?? 'Could not read this page. Refresh it and try again.');
  return response.scan;
}

export function fillTab(tabId: number, force = false): Promise<MessageMap['FILL_FORM']['response']> {
  return toPage(tabId, { action: 'FILL_FORM', payload: { force } });
}
