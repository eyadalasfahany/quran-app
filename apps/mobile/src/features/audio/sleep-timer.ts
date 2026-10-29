import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { pause, seek } from './player';
import { usePlayerStore } from './playerStore';

// The sleep timer (spec §12, step 5a). A timed mode fades the volume from 1 to 0 over FADE_MS, then pauses,
// then restores the volume to 1. End of surah pauses when the playlist moves on to the next surah.
// The deadline is wall-clock, so it survives backgrounding: the tick runs only in the foreground, and every
// return to the foreground checks the deadline again.

export type TimedSleepMode = 'minutes15' | 'minutes30' | 'minutes60';
export type SleepMode = 'off' | TimedSleepMode | 'endOfSurah';

export const SLEEP_MINUTES: Record<TimedSleepMode, number> = { minutes15: 15, minutes30: 30, minutes60: 60 };
export const FADE_MS = 3_000;
const TICK_MS = 250;
const MINUTE_MS = 60_000;

type SleepTimerState = {
  mode: SleepMode;
  /** Wall-clock deadline of a timed mode; null otherwise. */
  endsAtMs: number | null;
  /** The surah playing when end of surah was chosen. Its change ends the timer. */
  armedChapterId: number | null;
  /** The clock at the last tick, so the remaining minutes stay current. */
  nowMs: number;
  /** True while the volume is fading out. */
  fading: boolean;
};

export type SleepTimerActions = {
  choose: (mode: SleepMode) => void;
};

const idle: SleepTimerState = { mode: 'off', endsAtMs: null, armedChapterId: null, nowMs: 0, fading: false };

export const useSleepTimerStore = create<SleepTimerState & SleepTimerActions>()(() => ({
  ...idle,
  choose: (mode) => choose(mode, Date.now()),
}));

type Subscription = { remove: () => void };

let interval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: Subscription | null = null;

const sleep = () => useSleepTimerStore.getState();
const setSleep = (partial: Partial<SleepTimerState>) => useSleepTimerStore.setState(partial);

export function isTimedMode(mode: SleepMode): mode is TimedSleepMode {
  return mode === 'minutes15' || mode === 'minutes30' || mode === 'minutes60';
}

/** Whole minutes left on a timed mode, rounded up; null when no timed mode is armed. */
export function selectRemainingMinutes(state: Pick<SleepTimerState, 'endsAtMs' | 'nowMs'>): number | null {
  if (state.endsAtMs === null) {
    return null;
  }
  return Math.max(0, Math.ceil((state.endsAtMs - state.nowMs) / MINUTE_MS));
}

function setPlayerVolume(volume: number): void {
  usePlayerStore.getState().setVolume(volume);
}

function choose(mode: SleepMode, now: number): void {
  if (sleep().fading) {
    // A fade in progress is abandoned, not finished: the volume goes back to full.
    setPlayerVolume(1);
  }
  stopInterval();
  if (mode === 'off') {
    setSleep({ ...idle, nowMs: now });
    return;
  }
  if (mode === 'endOfSurah') {
    const chapterId = usePlayerStore.getState().chapterId;
    if (chapterId === null) {
      // Nothing is loaded, so there is no surah to finish.
      setSleep({ ...idle, nowMs: now });
      return;
    }
    setSleep({ ...idle, mode, armedChapterId: chapterId, nowMs: now });
    return;
  }
  ensureForegroundWatch();
  setSleep({ ...idle, mode, endsAtMs: now + SLEEP_MINUTES[mode] * MINUTE_MS, nowMs: now });
  startInterval();
}

/** Advances the timed fade and pauses once it completes. Called by the interval and on each foreground return. */
function tick(now: number): void {
  const state = sleep();
  if (!isTimedMode(state.mode) || state.endsAtMs === null) {
    return;
  }
  if (now < state.endsAtMs) {
    setSleep({ nowMs: now });
    return;
  }
  const progress = Math.min(1, (now - state.endsAtMs) / FADE_MS);
  if (progress < 1) {
    setPlayerVolume(1 - progress);
    setSleep({ nowMs: now, fading: true });
    return;
  }
  finish(now);
}

function finish(now: number): void {
  stopInterval();
  setPlayerVolume(0);
  pause();
  setPlayerVolume(1);
  setSleep({ ...idle, nowMs: now });
}

function startInterval(): void {
  if (interval !== null || !isTimedMode(sleep().mode)) {
    return;
  }
  interval = setInterval(() => tick(Date.now()), TICK_MS);
}

function stopInterval(): void {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}

function ensureForegroundWatch(): void {
  appStateSubscription ??= AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') {
      tick(Date.now());
      startInterval();
    } else {
      stopInterval();
    }
  });
}

// End of surah: the playlist has already moved to the next surah when the chapter changes. The pause waits for
// the rest of that change to finish, so seek(0) finds the new surah's file loaded.
usePlayerStore.subscribe((state, previous) => {
  const armed = sleep();
  if (armed.mode !== 'endOfSurah' || armed.armedChapterId === null) {
    return;
  }
  if (state.chapterId === previous.chapterId || state.chapterId === armed.armedChapterId) {
    return;
  }
  setSleep({ ...idle, nowMs: Date.now() });
  void Promise.resolve().then(() => {
    pause();
    seek(0);
  });
});

/** Test-only: forget the timer, its interval and its app-state listener. */
export function resetSleepTimerForTests(): void {
  stopInterval();
  appStateSubscription?.remove();
  appStateSubscription = null;
  setSleep({ ...idle });
}
