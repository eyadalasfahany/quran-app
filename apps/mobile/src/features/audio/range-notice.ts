import { create, type StoreApi, type UseBoundStore } from 'zustand';

// How long the notice stays, like the skip notice (ADR 0062).
export const RANGE_NOTICE_MS = 4_000;

export type RangeNotice = { id: number };

type RangeNoticeStore = {
  notice: RangeNotice | null;
  /** Shows the notice and restarts its timer. */
  show: () => void;
  clear: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let serial = 0;

function cancelTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * «هذا الجزء غير مسجّل لهذا القارئ» (ADR 0077 amendment): the part a partial surah's file does not record. Unlike the
 * skip notice it also shows when nothing plays, because a tap on an unrecorded ayah starts nothing. Transient, not
 * persisted. Ids only grow, so a stale timer or announcement never matches a newer notice.
 */
export const useRangeNoticeStore: UseBoundStore<StoreApi<RangeNoticeStore>> = create<RangeNoticeStore>()((set, get) => ({
  notice: null,
  show: () => {
    cancelTimer();
    serial += 1;
    const id = serial;
    set({ notice: { id } });
    timer = setTimeout(() => {
      timer = null;
      if (get().notice?.id === id) {
        set({ notice: null });
      }
    }, RANGE_NOTICE_MS);
  },
  clear: () => {
    cancelTimer();
    set({ notice: null });
  },
}));

/** Test-only: drop the notice and its timer. */
export function resetRangeNoticeForTests(): void {
  cancelTimer();
  useRangeNoticeStore.setState({ notice: null });
}

/** Whether the range notice is drawn. The bars reserve its line only then. */
export function useRangeNoticeShown(): boolean {
  return useRangeNoticeStore((state) => state.notice !== null);
}
