import { create } from 'zustand';

import { storage, storageKeys } from '@/core/storage/mmkv';

// Whether the reader's mini bar is collapsed to its capsule. Remembered across pages, surahs and launches
// (MMKV `reader.miniCollapsed`). Storage can be unavailable, so reads and writes are guarded.

export function readReaderMiniCollapsed(): boolean {
  try {
    return storage.getBoolean(storageKeys.readerMiniCollapsed) ?? false;
  } catch {
    return false;
  }
}

function writeReaderMiniCollapsed(collapsed: boolean): void {
  try {
    storage.set(storageKeys.readerMiniCollapsed, collapsed);
  } catch {
    // Without storage the state still holds for this session.
  }
}

export type ReaderMiniCollapse = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

export const useReaderMiniCollapse = create<ReaderMiniCollapse>()((set) => ({
  collapsed: readReaderMiniCollapsed(),
  setCollapsed: (collapsed) => {
    writeReaderMiniCollapsed(collapsed);
    set({ collapsed });
  },
}));
