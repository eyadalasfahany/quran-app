import { useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { resolveInitialAnchor } from './reading-anchor';

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    if (key === storageKeys.readerLastVerseKey) {
      onChange();
    }
  });
  return () => listener.remove();
}

function lastReadVerseKey(): string {
  return resolveInitialAnchor().verseKey;
}

// The saved reading position for screens outside the reader (Home, the index). It follows every save the
// reader makes, so «تابع القراءة» is never a stale ayah. The reader itself owns the position: useReadingAnchor.
export function useLastReadVerseKey(): string {
  return useSyncExternalStore(subscribe, lastReadVerseKey, lastReadVerseKey);
}
