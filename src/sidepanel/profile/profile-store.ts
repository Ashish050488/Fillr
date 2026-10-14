import { z } from 'zod';
import { profileSchema } from '../../shared/schemas';
import { getStorage, setStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import type { Profile } from '../../shared/types';

export type ProfileChange = (current: Profile) => Profile;
let writes: Promise<unknown> = Promise.resolve();

export function persistProfileChange(seed: Profile, change: ProfileChange): Promise<Profile> {
  const operation = writes.then(async () => {
    const profiles = z.array(profileSchema).parse(await getStorage<unknown>(STORAGE_KEYS.PROFILES, []));
    const current = profiles.find((profile) => profile.id === seed.id) ?? profileSchema.parse(seed);
    const updated = profileSchema.parse(change(current));
    if (updated.id !== seed.id) throw new Error('The profile changed while saving. Please reopen JobFill.');
    const exists = profiles.some((profile) => profile.id === seed.id);
    const updatedProfiles = exists
      ? profiles.map((profile) => (profile.id === seed.id ? updated : profile))
      : [...profiles, updated];
    await setStorage({ [STORAGE_KEYS.PROFILES]: updatedProfiles });
    return updated;
  });
  writes = operation.catch(() => undefined);
  return operation;
}
