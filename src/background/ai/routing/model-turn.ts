import { getStorage, setStorage } from '../../../shared/storage/extension-storage';

const TURN_STORAGE_KEY = 'jobfill_ai_model_turn_v1';

/** Round robin: each request for a task starts one model further along its tier. */
export async function takeNextModelTurn(task: string): Promise<number> {
  const turnsByTask = await getStorage<Record<string, number>>(TURN_STORAGE_KEY, {});
  const turn = Number.isInteger(turnsByTask[task]) ? turnsByTask[task] : 0;
  await setStorage({ [TURN_STORAGE_KEY]: { ...turnsByTask, [task]: (turn + 1) % 1000 } });
  return turn;
}
