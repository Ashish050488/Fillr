import { useEffect, useState } from 'react';

/** Live view of a chrome.storage.local key, so every open JobFill surface stays in sync. */
export function useStoredValue<StoredValue>(storageKey: string, fallbackValue: StoredValue): StoredValue {
  const [storedValue, setStoredValue] = useState<StoredValue>(fallbackValue);
  useEffect(() => {
    let isMounted = true;
    chrome.storage.local
      .get(storageKey)
      .then((storedEntries) => {
        if (isMounted) setStoredValue((storedEntries[storageKey] as StoredValue | undefined) ?? fallbackValue);
      })
      .catch(() => undefined);
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, storageArea: string) => {
      if (storageArea === 'local' && storageKey in changes) {
        setStoredValue((changes[storageKey].newValue as StoredValue | undefined) ?? fallbackValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
    // The fallback is a default for first render only; re-subscribing on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  return storedValue;
}
