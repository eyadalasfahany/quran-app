import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { usePlayerStore } from './playerStore';

// How long the skip notice stays (ADR 0062, Q5): one notice for a run of skipped surahs.
export const SKIP_NOTICE_MS = 4_000;

export type SkipNotice = {
  id: number;
  reciterId: number;
  /** The surahs continuous play moved over, in surah order. One or more. */
  chapterIds: number[];
};

type SkipNoticeStore = {
  notice: SkipNotice | null;
  /** Replaces the current notice and restarts its timer. */
  show: (notice: Omit<SkipNotice, 'id'>) => void;
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

// Transient and not persisted. Ids only grow, so a stale timer or a stale announcement can never match a newer notice.
export const useSkipNoticeStore: UseBoundStore<StoreApi<SkipNoticeStore>> = create<SkipNoticeStore>()((set, get) => ({
  notice: null,
  show: (notice) => {
    cancelTimer();
    serial += 1;
    const id = serial;
    set({ notice: { ...notice, id } });
    timer = setTimeout(() => {
      timer = null;
      if (get().notice?.id === id) {
        set({ notice: null });
      }
    }, SKIP_NOTICE_MS);
  },
  clear: () => {
    cancelTimer();
    set({ notice: null });
  },
}));

/** Test-only: drop the notice and its timer. The id counter keeps counting, so ids stay unique across tests. */
export function resetSkipNoticeForTests(): void {
  cancelTimer();
  useSkipNoticeStore.setState({ notice: null });
}

/**
 * Whether the skip notice is drawn: a notice exists and audio plays or loads. The bar draws it only then (ADR 0059),
 * so the footprints reserve the line only then too.
 */
export function useSkipNoticeShown(): boolean {
  const shown = useSkipNoticeStore((state) => state.notice !== null);
  const playing = usePlayerStore((state) => state.status === 'playing' || state.status === 'loading');
  return shown && playing;
}
