import { AppState, type AppStateStatus } from 'react-native';

import { FADE_MS, SLEEP_MINUTES, type TimedSleepMode } from '@/features/audio/sleep-timer';

import { useAzkarPlayerStore, type AzkarPlayerState, type AzkarSleepMode } from './azkarPlayerStore';
import { pauseAzkarPlayback } from './playback';

/**
 * The Azkar sleep timer (ADR 0031 §8). It mirrors the Quran timer's rules and reuses its values (the minutes and the
 * fade): a timed mode fades the volume to 0 over the last FADE_MS, pauses, then restores the volume. «نهاية الذكر» pauses
 * when the dhikr's run ends (`playback.ts` does it). The deadline is wall-clock, so it survives backgrounding.
 */

const TICK_MS = 250;
const MINUTE_MS = 60_000;

type Subscription = { remove: () => void };

let interval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: Subscription | null = null;

const state = () => useAzkarPlayerStore.getState();
const setState = (partial: Partial<AzkarPlayerState>) => useAzkarPlayerStore.setState(partial);

export function isAzkarTimedSleep(mode: AzkarSleepMode): mode is TimedSleepMode {
  return mode === 'minutes15' || mode === 'minutes30' || mode === 'minutes60';
}

/** Whole minutes left on a timed sleep, rounded up; null when none is armed. */
export function azkarSleepRemainingMinutes(endsAtMs: number | null, nowMs: number): number | null {
  if (endsAtMs === null) {
    return null;
  }
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / MINUTE_MS));
}

/** Arms a sleep mode, or cancels the one running. Choosing «إيقاف» restores the full volume. */
export function chooseAzkarSleep(mode: AzkarSleepMode, now: number = Date.now()): void {
  stopInterval();
  if (state().sleepFading) {
    setState({ volume: 1 });
  }
  if (!isAzkarTimedSleep(mode)) {
    setState({ sleepMode: mode, sleepEndsAtMs: null, sleepNowMs: now, sleepFading: false });
    return;
  }
  setState({ sleepMode: mode, sleepEndsAtMs: now + SLEEP_MINUTES[mode] * MINUTE_MS, sleepNowMs: now, sleepFading: false });
  ensureForegroundWatch();
  startInterval();
}

/** Advances the fade and pauses once it completes. Called by the interval and on each return to the foreground. */
export function tickAzkarSleep(now: number = Date.now()): void {
  const current = state();
  if (!isAzkarTimedSleep(current.sleepMode) || current.sleepEndsAtMs === null) {
    return;
  }
  if (now < current.sleepEndsAtMs) {
    setState({ sleepNowMs: now });
    return;
  }
  const progress = Math.min(1, (now - current.sleepEndsAtMs) / FADE_MS);
  if (progress < 1) {
    setState({ volume: 1 - progress, sleepNowMs: now, sleepFading: true });
    return;
  }
  finish(now);
}

function finish(now: number): void {
  stopInterval();
  pauseAzkarPlayback();
  setState({ volume: 1, sleepMode: 'off', sleepEndsAtMs: null, sleepNowMs: now, sleepFading: false });
}

function startInterval(): void {
  if (interval !== null) {
    return;
  }
  interval = setInterval(() => {
    tickAzkarSleep(Date.now());
  }, TICK_MS);
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
      tickAzkarSleep(Date.now());
      if (isAzkarTimedSleep(state().sleepMode)) {
        startInterval();
      }
    } else {
      stopInterval();
    }
  });
}

/** Test-only: forget the timer, its interval and its app-state listener. */
export function resetAzkarSleepForTests(): void {
  stopInterval();
  appStateSubscription?.remove();
  appStateSubscription = null;
  setState({ volume: 1, sleepMode: 'off', sleepEndsAtMs: null, sleepNowMs: 0, sleepFading: false });
}
