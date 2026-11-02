import { create } from 'zustand';

import type { AzkarQueueItem, AzkarRepeatMode } from './queue';

/**
 * The Azkar player's state (ADR 0031 §8). It is a store of its own: the Quran `playerStore` is never written here.
 * `playback.ts` drives it, and components read it.
 */

export type AzkarPlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'finished' | 'error';

/** Why playback stopped on an error: the device is offline and the recording is not downloaded, or it did not load. */
export type AzkarPlaybackError = 'offline' | 'load-failed';

export type AzkarSleepMode = 'off' | 'minutes15' | 'minutes30' | 'minutes60' | 'endOfUnit';

/** The reader scope the queue belongs to. `periodKey` is the progress period the plays count into. */
export type AzkarPlayerScope = { scopeKey: string; periodKey: string; title: string };

export type AzkarPlayerState = {
  scope: AzkarPlayerScope | null;
  queue: AzkarQueueItem[];
  /** The queue item playing (or last played); -1 when there is no queue. */
  index: number;
  status: AzkarPlaybackStatus;
  error: AzkarPlaybackError | null;
  positionMs: number;
  durationMs: number;
  repeatMode: AzkarRepeatMode;
  speed: number;
  /** 0 to 1. The sleep timer fades through it. */
  volume: number;
  /** Plays of the current run that have ended. */
  playsDone: number;
  /** Plays the current run makes; null loops until stopped. */
  runPlays: number | null;
  /** The unit's sourced count when its run began (0 without a count). */
  countAtStart: number;
  sleepMode: AzkarSleepMode;
  /** Wall-clock deadline of a timed sleep; null otherwise. */
  sleepEndsAtMs: number | null;
  /** The clock at the last sleep tick, so the remaining minutes stay current. */
  sleepNowMs: number;
  sleepFading: boolean;
};

export const initialAzkarPlayerState: AzkarPlayerState = {
  scope: null,
  queue: [],
  index: -1,
  status: 'idle',
  error: null,
  positionMs: 0,
  durationMs: 0,
  repeatMode: 'count',
  speed: 1,
  volume: 1,
  playsDone: 0,
  runPlays: 1,
  countAtStart: 0,
  sleepMode: 'off',
  sleepEndsAtMs: null,
  sleepNowMs: 0,
  sleepFading: false,
};

export const useAzkarPlayerStore = create<AzkarPlayerState>()(() => initialAzkarPlayerState);

/** The queue item playing now, or null. */
export function currentAzkarItem(state: Pick<AzkarPlayerState, 'queue' | 'index'>): AzkarQueueItem | null {
  return state.queue[state.index] ?? null;
}
