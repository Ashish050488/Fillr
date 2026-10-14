import { z } from 'zod';
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';

const KEY_HEALTH_STORAGE_KEY = 'jobfill_ai_key_state_v1';
const keyHealthSchema = z.record(
  z.object({ invalid: z.boolean().optional(), cooldownUntil: z.number().finite().optional() }),
);
export type KeyState = z.infer<typeof keyHealthSchema>[string];
export const keyIdentity = (provider: string, key: string) => `${provider}:${key}`;

export async function readKeyState(): Promise<Record<string, KeyState>> {
  const parsedHealth = keyHealthSchema.safeParse(await getStorage<unknown>(KEY_HEALTH_STORAGE_KEY, {}));
  return parsedHealth.success ? parsedHealth.data : {};
}

export async function updateKeyState(identity: string, healthChange: KeyState): Promise<void> {
  const healthByKey = await readKeyState();
  await setStorage({
    [KEY_HEALTH_STORAGE_KEY]: { ...healthByKey, [identity]: { ...healthByKey[identity], ...healthChange } },
  });
}

export async function clearKeyState(identity: string): Promise<void> {
  const healthByKey = await readKeyState();
  delete healthByKey[identity];
  await setStorage({ [KEY_HEALTH_STORAGE_KEY]: healthByKey });
}
