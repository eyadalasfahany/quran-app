import { create } from 'zustand';

import { REPEAT_COUNTS, type RepeatRange, type RepeatRequest } from './repeat';

export const CHAPTER_COUNT = 114;

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// Reason codes only. The UI maps them to copy.
export type PlayerErrorCode =
  | 'no-reciter'
  | 'not-installed'
  | 'load-failed'
  | 'not-found'
  | 'invalid-chapter'
  | 'invalid-verse'
  /** Not downloaded and the device is offline: the stream cannot start. */
  | 'offline'
  /** Downloaded, but not verified in the last 7 days, and the device is offline (the licence rule). */
  | 'verify-required';

/**
 * What a play entry point was asked to start, recorded on tap before any pack install. The buttons read it to show
 * the buffering ring from tap to first audio (ADR 0046).
 */
export type PlayTarget =
  | { kind: 'verse'; verseKey: string }
  | { kind: 'reciter'; resourceId: number }
  | { kind: 'surah'; resourceId: number; chapterId: number }
  | { kind: 'listen'; resourceId: number; chapterId: number };

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
  /** 0 to 1. The engine applies it to the playlist; the sleep timer fades through it. */
  volume: number;
  /** The ayah being recited, from the loaded file's timings. Null when nothing is recited or the file has no timings. */
  activeVerseId: number | null;
  /** The word being recited (1-based, as QF sends it), when the ayah has word segments. */
  activeWord: number | null;
  /** The ayah range being repeated in the current surah. Null when no repeat is set. */
  repeat: RepeatRange | null;
  /** Monotonic counter bumped on each user play/resume command; the reader uses it to resume following (ADR 0037). */
  playCommand: number;
  /**
   * The play the user asked for, from the tap until audio plays. Set by the play entry points before any pack install;
   * cleared when audio plays, pauses, fails or stops, and when an entry point returns without starting.
   */
  startingTarget: PlayTarget | null;
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

export type MoveRequest = {
  chapterId: number;
  durationMs: number;
};

export type PlayerActions = {
  beginLoad: (request: LoadRequest) => void;
  /** The playlist moved to another surah on its own (natural end, lock screen). Keeps the status. */
  moveTo: (request: MoveRequest) => void;
  markPlaying: () => void;
  markPaused: () => void;
  markStopped: () => void;
  markFailed: (code: PlayerErrorCode) => void;
  setPosition: (positionMs: number) => void;
  setDuration: (durationMs: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  /** Sets the highlighted ayah and word. Does nothing when both are unchanged. */
  setActive: (verseId: number | null, word: number | null) => void;
  /** Sets the repeat range with done at 0. Does nothing when `count` is not offered or `from` is after `to`. */
  setRepeat: (request: RepeatRequest) => void;
  clearRepeat: () => void;
  /** Counts one more seek back to the start of the repeat range. */
  advanceRepeat: () => void;
  restore: (request: RestoreRequest) => void;
  reset: () => void;
  bumpPlayCommand: () => void;
  beginStarting: (target: PlayTarget) => void;
  clearStarting: () => void;
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
  volume: 1,
  activeVerseId: null,
  activeWord: null,
  repeat: null,
  playCommand: 0,
  startingTarget: null,
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
  moveTo: ({ chapterId, durationMs }) =>
    set({
      chapterId,
      queue: queueFrom(chapterId),
      positionMs: 0,
      durationMs,
      activeVerseId: null,
      activeWord: null,
      repeat: null,
    }),
  markPlaying: () => set({ status: 'playing', error: null, startingTarget: null }),
  markPaused: () =>
    set((state) =>
      state.status === 'playing' || state.status === 'loading'
        ? { status: 'paused', startingTarget: null }
        : { startingTarget: null },
    ),
  markStopped: () =>
    set({ status: 'idle', positionMs: 0, activeVerseId: null, activeWord: null, repeat: null, startingTarget: null }),
  markFailed: (code) =>
    set({ status: 'error', error: code, activeVerseId: null, activeWord: null, startingTarget: null }),
  setPosition: (positionMs) => set({ positionMs }),
  setDuration: (durationMs) => set({ durationMs }),
  setSpeed: (speed) => set({ speed }),
  setVolume: (volume) => set((state) => (Number.isFinite(volume) ? { volume: clampVolume(volume) } : state)),
  setActive: (activeVerseId, activeWord) =>
    set((state) => (state.activeVerseId === activeVerseId && state.activeWord === activeWord ? state : { activeVerseId, activeWord })),
  setRepeat: ({ fromVerseId, toVerseId, count }) =>
    set((state) =>
      REPEAT_COUNTS.includes(count) && fromVerseId <= toVerseId ? { repeat: { fromVerseId, toVerseId, count, done: 0 } } : state,
    ),
  clearRepeat: () => set((state) => (state.repeat === null ? state : { repeat: null })),
  advanceRepeat: () =>
    set((state) => (state.repeat === null ? state : { repeat: { ...state.repeat, done: state.repeat.done + 1 } })),
  restore: ({ reciterId, chapterId, positionMs }) =>
    set({
      reciterId,
      chapterId,
      queue: queueFrom(chapterId),
      status: 'paused',
      error: null,
      positionMs,
      durationMs: 0,
      activeVerseId: null,
      activeWord: null,
      repeat: null,
    }),
  reset: () => set(initialPlayerState),
  bumpPlayCommand: () => set((state) => ({ playCommand: state.playCommand + 1 })),
  beginStarting: (startingTarget) => set({ startingTarget }),
  clearStarting: () => set({ startingTarget: null }),
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

/** Volume is 0 to 1. Values outside that range are clamped to it. */
export function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

/**
 * Seeks are clamped at zero only. The content row's duration is rounded down and can be shorter than the
 * last ayah, so it must not limit a seek.
 */
export function clampSeek(positionMs: number): number {
  return Number.isFinite(positionMs) ? Math.max(0, Math.round(positionMs)) : 0;
}
