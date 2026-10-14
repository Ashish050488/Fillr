import type { MessageAction, MessageMap } from '../types';

export const RELOAD_MESSAGE = 'RELOAD_EXTENSION' as const;
const CONTEXT_INVALIDATED_MESSAGE = 'JobFill was updated or reloaded. Refresh this page and try again.';
export type Message<A extends MessageAction = MessageAction> = { action: A; payload: MessageMap[A]['request'] };
export function sendMessage<A extends MessageAction>(
  action: A,
  payload: MessageMap[A]['request'],
): Promise<MessageMap[A]['response']> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action, payload }, (response: MessageMap[A]['response'] | undefined) => {
        const error = chrome.runtime.lastError;
        if (error) {
          const message = error.message ?? '';
          if (
            /Extension context invalidated|Could not establish connection|message (port|channel) closed/i.test(message)
          ) {
            reject(new Error(CONTEXT_INVALIDATED_MESSAGE));
          } else {
            reject(new Error(message));
          }
          return;
        }
        if (response === undefined) {
          reject(new Error('JobFill did not respond. Refresh this page and try again.'));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reject(
        new Error(
          /context invalidated|Could not establish connection/i.test(message) ? CONTEXT_INVALIDATED_MESSAGE : message,
        ),
      );
    }
  });
}
export function onMessage<A extends MessageAction>(
  action: A,
  handler: (
    payload: MessageMap[A]['request'],
    sender: chrome.runtime.MessageSender,
  ) => Promise<MessageMap[A]['response']> | MessageMap[A]['response'],
): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || (message as { action?: unknown }).action !== action) return false;
    Promise.resolve()
      .then(() => handler((message as { payload: MessageMap[A]['request'] }).payload, sender))
      .then(sendResponse)
      .catch((error: unknown) =>
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }),
      );
    return true;
  });
}

/** sendMessage that gives up after `ms`, so the page UI can never hang on a lost reply. */
export function sendMessageWithin<A extends MessageAction>(
  action: A,
  payload: MessageMap[A]['request'],
  ms: number,
  timeoutMessage: string,
): Promise<MessageMap[A]['response']> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([sendMessage(action, payload), expired]).finally(() => clearTimeout(timer));
}
