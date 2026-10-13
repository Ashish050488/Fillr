import type { MessageAction } from '@/shared/messages';

// Plain TypeScript content bridge; feature implementations can subscribe without React.
chrome.runtime.onMessage.addListener((message: { action: MessageAction }, _sender, sendResponse) => {
  if (message.action === 'PING') sendResponse({ status: 'pong', url: location.href });
  return message.action === 'PING';
});
