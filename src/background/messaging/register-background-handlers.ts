import { buildFillProfile } from '../profile/build-fill-profile';
import { registerAiKeyHandlers } from './ai-key-handlers';
import { registerAnswerHandlers } from './answer-handlers';
import { registerFrameHandlers } from './frame-handlers';
import { registerJobHandlers } from './job-handlers';
import { createMessageRegistrar } from './message-registrar';
import { registerProfileBoostHandlers } from './profile-boost-handlers';
import { registerReferralHandlers } from './referral-handlers';

export { isExtensionPage } from './message-registrar';

/** Every message the background answers, grouped by area. Called once as the service worker starts. */
export function registerBackgroundHandlers(storageReady: Promise<unknown> = Promise.resolve()): void {
  const handle = createMessageRegistrar(storageReady);
  registerAiKeyHandlers(handle);
  registerJobHandlers(handle);
  registerFrameHandlers(handle);
  registerAnswerHandlers(handle);
  registerReferralHandlers(handle);
  registerProfileBoostHandlers(handle);
  handle('GET_FILL_PROFILE', buildFillProfile);
}
