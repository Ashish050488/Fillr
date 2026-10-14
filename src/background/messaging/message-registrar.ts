import { onMessage } from '../../shared/messaging/extension-messages';
import type { MessageAction, MessageMap } from '../../shared/types';

export type MessageHandler<Action extends MessageAction> = (
  payload: MessageMap[Action]['request'],
  sender: chrome.runtime.MessageSender,
) => Promise<MessageMap[Action]['response']>;

export type RegisterMessageHandler = <Action extends MessageAction>(
  action: Action,
  handler: MessageHandler<Action>,
) => void;

const EXTENSION_PAGES = ['options.html', 'sidepanel.html'];

/** True only for JobFill's own pages (never a website, even one that embeds them). */
export function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || !sender.url) return false;
  try {
    const senderUrl = new URL(sender.url);
    return EXTENSION_PAGES.some((page) => {
      const expectedUrl = new URL(chrome.runtime.getURL(page));
      return (
        senderUrl.protocol === expectedUrl.protocol &&
        senderUrl.host === expectedUrl.host &&
        senderUrl.pathname === expectedUrl.pathname
      );
    });
  } catch {
    return false;
  }
}

/** A readable error message with any API key removed from it. */
export function describeError(error: unknown, secret?: string, fallbackMessage = 'Request failed'): string {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return secret ? message.split(secret).join('[redacted]') : message;
}

/**
 * Handlers are registered synchronously while the service worker starts (Chrome requires it);
 * each one waits until storage has been locked to extension pages before it runs.
 */
export function createMessageRegistrar(storageReady: Promise<unknown>): RegisterMessageHandler {
  const isStorageSecured = storageReady.then(
    () => true,
    () => false,
  );
  return (action, handler) => {
    onMessage(action, async (payload, sender) => {
      if (!(await isStorageSecured)) {
        throw new Error('JobFill could not secure local storage. Reload the extension and try again.');
      }
      return handler(payload, sender);
    });
  };
}
