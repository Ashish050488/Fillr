import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '../../shared/messaging/extension-messages';

const REMEMBERED_ANSWERS_STORAGE_KEY = 'jobfill_remembered_answers_v1';

export interface SavedAnswer {
  key: string;
  label: string;
  answer: string;
  savedAt: number;
}

/** Your saved application answers, kept in sync with the page widget, plus save and forget. */
export function useSavedAnswers() {
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);

  const loadSavedAnswers = useCallback(async () => {
    const reply = await sendMessage('ANSWERS_LIST', undefined).catch(() => undefined);
    if (!reply?.success) return;
    setSavedAnswers(
      Object.entries(reply.answers ?? {})
        .map(([key, savedAnswer]) => ({ key, ...savedAnswer }))
        .sort((first, second) => second.savedAt - first.savedAt),
    );
  }, []);

  useEffect(() => {
    void loadSavedAnswers();
    const handleStorageChange = (changes: Record<string, unknown>) => {
      if (REMEMBERED_ANSWERS_STORAGE_KEY in changes) void loadSavedAnswers();
    };
    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => chrome.storage?.onChanged?.removeListener(handleStorageChange);
  }, [loadSavedAnswers]);

  const saveAnswer = async (key: string, label: string, answer: string) => {
    await sendMessage('ANSWER_REMEMBER', { entries: [{ key, label, answer }] }).catch(() => undefined);
    await loadSavedAnswers();
  };

  const forgetAnswer = async (key: string) => {
    await sendMessage('ANSWER_FORGET', { key }).catch(() => undefined);
    await loadSavedAnswers();
  };

  return { savedAnswers, saveAnswer, forgetAnswer };
}
