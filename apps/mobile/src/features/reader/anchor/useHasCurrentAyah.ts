import { useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    if (key === storageKeys.readerLastVerseKey) {
      onChange();
    }
  });
  return () => listener.remove();
}

function hasSavedAyah(): boolean {
  return storage.contains(storageKeys.readerLastVerseKey);
}

// True once an ayah has been saved as the current one (ADR 0046). Unlike useLastReadVerseKey, it does not fall back to
// the first ayah, so a fresh install with nothing read reads false.
export function useHasCurrentAyah(): boolean {
  return useSyncExternalStore(subscribe, hasSavedAyah, hasSavedAyah);
}
