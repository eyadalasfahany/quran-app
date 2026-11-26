import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { create } from 'zustand';

import { isShortWindowHeight } from '@/core/layout/window-class';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { drawnCollapsed } from '@/features/reader/mini-bar-collapse';

// Whether the map's age timeline is hidden to its corner capsule, like the reader's mini bar (developer, 26 Nov 2026).
// Remembered across launches (MMKV `seerah.timelineCollapsed`). Storage can be unavailable, so reads and writes are guarded.

export function readTimelineCollapsed(): boolean {
  try {
    return storage.getBoolean(storageKeys.seerah.timelineCollapsed) ?? false;
  } catch {
    return false;
  }
}

function writeTimelineCollapsed(collapsed: boolean): void {
  try {
    storage.set(storageKeys.seerah.timelineCollapsed, collapsed);
  } catch {
    // Without storage the state still holds for this session.
  }
}

type TimelineCollapse = {
  collapsed: boolean;
  /** Short window only: the timeline the reader opened from the capsule. Not persisted. */
  shortOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setShortOpen: (open: boolean) => void;
};

export const useTimelineCollapseStore = create<TimelineCollapse>()((set) => ({
  collapsed: readTimelineCollapsed(),
  shortOpen: false,
  setCollapsed: (collapsed) => {
    writeTimelineCollapsed(collapsed);
    set({ collapsed });
  },
  setShortOpen: (shortOpen) => set({ shortOpen }),
}));

/**
 * The timeline's collapsed state as drawn, with the mini player's rule (`drawnCollapsed`): a short window (a phone in
 * landscape) starts collapsed and opens only on a tap, which it forgets when the window stops being short; tall windows
 * keep the saved choice. The setter saves only on tall windows.
 */
export function useTimelineCollapse(): [boolean, (collapsed: boolean) => void] {
  const short = isShortWindowHeight(useWindowDimensions().height);
  const stored = useTimelineCollapseStore((state) => state.collapsed);
  const shortOpen = useTimelineCollapseStore((state) => state.shortOpen);
  const setStored = useTimelineCollapseStore((state) => state.setCollapsed);
  const setShortOpen = useTimelineCollapseStore((state) => state.setShortOpen);

  useEffect(() => {
    if (!short) {
      setShortOpen(false);
    }
  }, [short, setShortOpen]);

  const set = (collapsed: boolean) => (short ? setShortOpen(!collapsed) : setStored(collapsed));
  return [drawnCollapsed(short, stored, shortOpen), set];
}
