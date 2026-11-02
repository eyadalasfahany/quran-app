import { create } from 'zustand';

import { nextTabBarScrollOffsetState, type TabBarScrollOffsetState } from './tab-bar-scroll-offset';

type TabBarScrollStore = TabBarScrollOffsetState & {
  /** When false, scroll offsets are ignored (short rail, or outside main tabs). */
  tracking: boolean;
  setTracking: (tracking: boolean) => void;
  reset: () => void;
  reportOffset: (y: number) => void;
};

export const useTabBarScrollStore = create<TabBarScrollStore>((set, get) => ({
  collapsed: false,
  lastY: 0,
  tracking: false,
  setTracking: (tracking) => {
    if (!tracking) {
      set({ collapsed: false, lastY: 0, tracking: false });
      return;
    }
    set({ tracking: true });
  },
  reset: () => set({ collapsed: false, lastY: 0 }),
  reportOffset: (y) => {
    if (!get().tracking) {
      return;
    }
    set((state) => nextTabBarScrollOffsetState(state, y));
  },
}));
