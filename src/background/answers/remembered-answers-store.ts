import { z } from 'zod';
import { getStorage, setStorage } from '../../shared/storage/extension-storage';

const REMEMBERED_ANSWERS_STORAGE_KEY = 'jobfill_remembered_answers_v1';
const MAXIMUM_REMEMBERED_ANSWERS = 300;
const MAXIMUM_ANSWER_LENGTH = 2000;

const rememberedAnswerSchema = z.object({
  answer: z.string(),
  label: z.string(),
  savedAt: z.number().finite(),
});
const rememberedAnswersSchema = z.record(rememberedAnswerSchema);
export type RememberedAnswer = z.infer<typeof rememberedAnswerSchema>;

let pendingWrites: Promise<unknown> = Promise.resolve();

export async function readRememberedAnswers(): Promise<Record<string, RememberedAnswer>> {
  const parsedAnswers = rememberedAnswersSchema.safeParse(
    await getStorage<unknown>(REMEMBERED_ANSWERS_STORAGE_KEY, {}),
  );
  return parsedAnswers.success ? parsedAnswers.data : {};
}

/** Answers for the given keys only; the page never sees the rest. */
export async function lookUpRememberedAnswers(answerKeys: string[]): Promise<Record<string, string>> {
  const rememberedAnswers = await readRememberedAnswers();
  return Object.fromEntries(
    answerKeys
      .filter((answerKey) => rememberedAnswers[answerKey])
      .map((answerKey) => [answerKey, rememberedAnswers[answerKey].answer]),
  );
}

function writeInOrder(change: (answers: Record<string, RememberedAnswer>) => void): Promise<void> {
  const write = pendingWrites.then(async () => {
    const rememberedAnswers = await readRememberedAnswers();
    change(rememberedAnswers);
    const newestAnswers = Object.entries(rememberedAnswers)
      .sort(([, first], [, second]) => second.savedAt - first.savedAt)
      .slice(0, MAXIMUM_REMEMBERED_ANSWERS);
    await setStorage({ [REMEMBERED_ANSWERS_STORAGE_KEY]: Object.fromEntries(newestAnswers) });
  });
  pendingWrites = write.catch(() => undefined);
  return write;
}

export function rememberAnswers(entries: Array<{ key: string; label: string; answer: string }>): Promise<void> {
  return writeInOrder((rememberedAnswers) => {
    for (const entry of entries) {
      const answer = entry.answer.trim().slice(0, MAXIMUM_ANSWER_LENGTH);
      if (!entry.key || !answer) continue;
      rememberedAnswers[entry.key] = { answer, label: entry.label.slice(0, 400), savedAt: Date.now() };
    }
  });
}

export function forgetAnswer(answerKey: string): Promise<void> {
  return writeInOrder((rememberedAnswers) => {
    delete rememberedAnswers[answerKey];
  });
}
