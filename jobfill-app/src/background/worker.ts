import type { MessageAction, MessageMap } from '@/shared/messages';

const handlers: Partial<{ [A in MessageAction]: (request: MessageMap[A]['request']) => Promise<MessageMap[A]['response']> }> = {
  GET_STATUS: async () => ({ status: 'ready', version: '2.0.0' })
};

chrome.runtime.onMessage.addListener((message: { action: MessageAction; payload?: unknown }, _sender, sendResponse) => {
  const handler = handlers[message.action];
  if (!handler) return false;
  handler(message.payload as never).then(sendResponse).catch((error: Error) => sendResponse({ success: false, error: error.message }));
  return true;
});
