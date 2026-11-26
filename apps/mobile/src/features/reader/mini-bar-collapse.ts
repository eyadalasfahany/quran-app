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
  /** Short window only: the bar the reader expanded from the corner capsule. Not persisted; a hand scroll clears it. */
  shortOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setShortOpen: (open: boolean) => void;
};

export const useReaderMiniCollapse = create<ReaderMiniCollapse>()((set) => ({
  collapsed: readReaderMiniCollapsed(),
  shortOpen: false,
  setCollapsed: (collapsed) => {
    writeReaderMiniCollapsed(collapsed);
    set({ collapsed });
  },
  setShortOpen: (shortOpen) => set({ shortOpen }),
}));

/**
 * Collapsed as drawn. A short window (landscape phone) starts collapsed and expands only on the reader's tap
 * (ADR 0090 amendment, item 8); tall windows keep the saved choice.
 */
export function drawnCollapsed(short: boolean, collapsed: boolean, shortOpen: boolean): boolean {
  return short ? !shortOpen : collapsed;
}

/** Sets the collapsed state the reader asked for: a short window only opens or closes the bar, it never saves the choice. */
export function setDrawnCollapsed(short: boolean, collapsed: boolean): void {
  if (short) {
    useReaderMiniCollapse.getState().setShortOpen(!collapsed);
  } else {
    useReaderMiniCollapse.getState().setCollapsed(collapsed);
  }
}
