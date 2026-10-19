import { profileBoostRequestSchema } from '../../shared/schemas';
import { boostProfile, savedProfileBoost } from '../profile/profile-boost-service';
import { describeError, isExtensionPage, type RegisterMessageHandler } from './message-registrar';

/** Rewrites of your own job-site profile, asked for from the side panel only. */
export function registerProfileBoostHandlers(handle: RegisterMessageHandler): void {
  handle('PROFILE_BOOST', async (payload, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Only the JobFill panel can rewrite your profile.' };
    const parsedRequest = profileBoostRequestSchema.safeParse(payload);
    if (!parsedRequest.success)
      return { success: false, error: 'This page could not be read. Refresh it and try again.' };
    const { scan, refresh, cachedOnly } = parsedRequest.data;
    try {
      const saved = refresh ? undefined : await savedProfileBoost(scan);
      if (saved || cachedOnly) return { success: true, boost: saved };
      return { success: true, boost: await boostProfile(scan) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'Could not rewrite your profile.') };
    }
  });
}
