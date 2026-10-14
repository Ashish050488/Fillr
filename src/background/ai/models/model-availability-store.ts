import { z } from 'zod';
import { getStorage, setStorage } from '../../../shared/storage/extension-storage';

const MODEL_AVAILABILITY_STORAGE_KEY = 'jobfill_ai_model_state_v1';
const ONE_DAY_MILLISECONDS = 86_400_000;
const availabilitySchema = z.record(z.object({ unavailableUntil: z.number().finite() }));

const buildModelIdentity = (provider: string, key: string, model: string) => `${provider}:${key}:${model}`;

async function readAvailability(): Promise<Record<string, { unavailableUntil: number }>> {
  const parsedAvailability = availabilitySchema.safeParse(
    await getStorage<unknown>(MODEL_AVAILABILITY_STORAGE_KEY, {}),
  );
  return parsedAvailability.success ? parsedAvailability.data : {};
}

export async function unavailable(provider: string, key: string, model: string): Promise<boolean> {
  const availability = await readAvailability();
  return (availability[buildModelIdentity(provider, key, model)]?.unavailableUntil ?? 0) > Date.now();
}

export async function markUnavailable(
  provider: string,
  key: string,
  model: string,
  durationMilliseconds = ONE_DAY_MILLISECONDS,
): Promise<void> {
  const availability = await readAvailability();
  availability[buildModelIdentity(provider, key, model)] = { unavailableUntil: Date.now() + durationMilliseconds };
  await setStorage({ [MODEL_AVAILABILITY_STORAGE_KEY]: availability });
}

export async function clearModelUnavailable(provider: string, key: string): Promise<void> {
  const availability = await readAvailability();
  const keyPrefix = `${provider}:${key}:`;
  const remainingAvailability = Object.fromEntries(
    Object.entries(availability).filter(([modelIdentity]) => !modelIdentity.startsWith(keyPrefix)),
  );
  await setStorage({ [MODEL_AVAILABILITY_STORAGE_KEY]: remainingAvailability });
}
