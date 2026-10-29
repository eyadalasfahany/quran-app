import { create } from 'zustand';

export const CHAPTER_COUNT = 114;

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// Reason codes only. The UI maps them to copy.
export type PlayerErrorCode =
  | 'no-reciter'
  | 'not-installed'
  | 'load-failed'
  | 'not-found'
  | 'invalid-chapter'
  | 'invalid-verse';

export type PlayerState = {
  reciterId: number | null;
  queue: number[];
  chapterId: number | null;
  status: PlayerStatus;
  error: PlayerErrorCode | null;
  positionMs: number;
  /** Placeholder from the content row while loading; replaced by the player's own duration once loaded. */
  durationMs: number;
  speed: number;
  /** Filled by step 3 (audio to ayah). Unused until then. */
  activeVerseId: number | null;
  activeWord: number | null;
};

export type LoadRequest = {
  reciterId: number | null;
  chapterId: number;
  positionMs: number;
  durationMs: number;
};

export type RestoreRequest = {
  reciterId: number | null;
  chapterId: number;
  positionMs: number;
};

export type PlayerActions = {
  beginLoad: (request: LoadRequest) => void;
  markPlaying: () => void;
  markPaused: () => void;
  markStopped: () => void;
  markFailed: (code: PlayerErrorCode) => void;
  setPosition: (positionMs: number) => void;
  setDuration: (durationMs: number) => void;
  setSpeed: (speed: number) => void;
  restore: (request: RestoreRequest) => void;
  reset: () => void;
};

export const initialPlayerState: PlayerState = {
  reciterId: null,
  queue: [],
  chapterId: null,
  status: 'idle',
  error: null,
  positionMs: 0,
  durationMs: 0,
  speed: 1,
  activeVerseId: null,
  activeWord: null,
};

export const usePlayerStore = create<PlayerState & PlayerActions>()((set) => ({
  ...initialPlayerState,
  beginLoad: ({ reciterId, chapterId, positionMs, durationMs }) =>
    set({
      reciterId,
      chapterId,
      queue: queueFrom(chapterId),
      status: 'loading',
      error: null,
      positionMs,
      durationMs,
      activeVerseId: null,
      activeWord: null,
    }),
  markPlaying: () => set({ status: 'playing', error: null }),
  markPaused: () => set((state) => (state.status === 'playing' || state.status === 'loading' ? { status: 'paused' } : {})),
  markStopped: () => set({ status: 'idle', positionMs: 0 }),
  markFailed: (code) => set({ status: 'error', error: code }),
  setPosition: (positionMs) => set({ positionMs }),
  setDuration: (durationMs) => set({ durationMs }),
  setSpeed: (speed) => set({ speed }),
  restore: ({ reciterId, chapterId, positionMs }) =>
    set({
      reciterId,
      chapterId,
      queue: queueFrom(chapterId),
      status: 'paused',
      error: null,
      positionMs,
      durationMs: 0,
    }),
  reset: () => set(initialPlayerState),
}));

export function isChapterId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= CHAPTER_COUNT;
}

/** One entry per surah from `chapterId` to the last one: the gapless run the player advances through. */
export function queueFrom(chapterId: number): number[] {
  const queue: number[] = [];
  for (let id = chapterId; id <= CHAPTER_COUNT; id += 1) {
    queue.push(id);
  }
  return queue;
}

/** The surah after `chapterId`, or null after 114. */
export function nextChapterId(chapterId: number): number | null {
  return chapterId < CHAPTER_COUNT ? chapterId + 1 : null;
}

export function previousChapterId(chapterId: number): number {
  return Math.min(CHAPTER_COUNT, Math.max(1, chapterId - 1));
}

/**
 * Seeks are clamped at zero only. The content row's duration is rounded down and can be shorter than the
 * last ayah, so it must not limit a seek.
 */
export function clampSeek(positionMs: number): number {
  return Number.isFinite(positionMs) ? Math.max(0, Math.round(positionMs)) : 0;
}
