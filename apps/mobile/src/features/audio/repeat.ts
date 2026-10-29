import type { AyahTiming } from './data/timings';
import { ayahSeekStartMs } from './active-ayah';

// Repeat of an ayah range (spec §12, step 5b). Pure decisions only: the player applies them on its status tick.

/** The counts the repeat control offers. Infinity repeats until the person stops or leaves the range. */
export const REPEAT_COUNTS: readonly number[] = [1, 3, 5, 10, Infinity];

/** The range ends this close before the last ayah's end, so the seek lands before the next ayah is heard. */
export const REPEAT_END_TOLERANCE_MS = 50;

export type RepeatRange = {
  fromVerseId: number;
  toVerseId: number;
  /** Plays of the range in total: 1 plays it once and then continues. Infinity repeats for ever. */
  count: number;
  /** Seeks back to the start of the range so far. */
  done: number;
};

export type RepeatRequest = Pick<RepeatRange, 'fromVerseId' | 'toVerseId' | 'count'>;

/** 'none' keeps playing; `seekTo` goes back to the start of the range; 'finish' ends the repeat. */
export type RepeatAction = 'none' | { seekTo: number } | 'finish';

function indexOfVerse(timings: readonly AyahTiming[], verseId: number): number {
  return timings.findIndex((timing) => timing.verseId === verseId);
}

function findVerse(timings: readonly AyahTiming[], verseId: number): AyahTiming | undefined {
  return timings.find((timing) => timing.verseId === verseId);
}

/** True when the count is one the control offers, both ayahs are in these timings, and `from` is not after `to`. */
export function isRepeatRangeValid(request: RepeatRequest, timings: readonly AyahTiming[]): boolean {
  if (!REPEAT_COUNTS.includes(request.count)) {
    return false;
  }
  const from = indexOfVerse(timings, request.fromVerseId);
  const to = indexOfVerse(timings, request.toVerseId);
  return from >= 0 && to >= from;
}

/** True when the ayah is inside the range, both ends included. */
export function repeatContainsVerse(repeat: RepeatRange, timings: readonly AyahTiming[], verseId: number): boolean {
  const from = indexOfVerse(timings, repeat.fromVerseId);
  const to = indexOfVerse(timings, repeat.toVerseId);
  const at = indexOfVerse(timings, verseId);
  return from >= 0 && to >= from && at >= from && at <= to;
}

/** True when the position is from the start of the range's first ayah to the end of its last. */
export function repeatContainsPosition(repeat: RepeatRange, timings: readonly AyahTiming[], positionMs: number): boolean {
  const first = findVerse(timings, repeat.fromVerseId);
  const last = findVerse(timings, repeat.toVerseId);
  if (first === undefined || last === undefined) {
    return false;
  }
  return positionMs >= first.startMs && positionMs <= last.endMs;
}

/**
 * What to do at `positionMs`, the decoded position. Once it reaches the end of the range's last ayah (less the
 * tolerance), the range repeats while `done + 1 < count`, and finishes after that. With a missing timing, nothing.
 */
export function repeatAction(repeat: RepeatRange | null, timings: readonly AyahTiming[], positionMs: number): RepeatAction {
  if (repeat === null) {
    return 'none';
  }
  const first = findVerse(timings, repeat.fromVerseId);
  const last = findVerse(timings, repeat.toVerseId);
  if (first === undefined || last === undefined) {
    return 'none';
  }
  if (positionMs < last.endMs - REPEAT_END_TOLERANCE_MS) {
    return 'none';
  }
  if (repeat.done + 1 < repeat.count) {
    return { seekTo: ayahSeekStartMs(first) };
  }
  return 'finish';
}
