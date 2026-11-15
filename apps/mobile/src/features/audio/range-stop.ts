import type { AyahTiming } from './data/timings';

// A verse range played from a dua (ADR 0092 decision 3). Pure decisions only: the player applies them on its status tick.

/**
 * The range being played: from the first ayah's start to the end of the last. Both ayahs are in `chapterId`'s file.
 * Null when no range play is running.
 */
export type RangePlay = {
  chapterId: number;
  fromVerseId: number;
  toVerseId: number;
};

/**
 * The player reports the position it decodes, and the audio is heard a little later (the output buffer, the speaker or
 * Bluetooth route). The range stops once the decoded position is this far past the end of its last ayah, so the heard
 * audio has reached that end before playback stops, and the next ayah's first sound is not let through. The same
 * estimate as the highlight lag (HIGHLIGHT_LAG_MS). Tuned on the iPhone 17 simulator and a device.
 */
export const RANGE_STOP_LAG_MS = 100;

/** 'none' keeps playing; 'stop' ends the range play. */
export type RangeStopAction = 'none' | 'stop';

function findVerse(timings: readonly AyahTiming[], verseId: number): AyahTiming | undefined {
  return timings.find((timing) => timing.verseId === verseId);
}

/**
 * Whether both ends of the range have a timing in these timings, in order. A range with no timings for its ends cannot
 * stop at them, so it does not play as a range.
 */
export function isRangeInTimings(range: RangePlay, timings: readonly AyahTiming[]): boolean {
  const from = timings.findIndex((timing) => timing.verseId === range.fromVerseId);
  const to = timings.findIndex((timing) => timing.verseId === range.toVerseId);
  return from >= 0 && to >= from;
}

/**
 * What to do at `positionMs`, the decoded position of the surah now playing. Playback stops once the position reaches the
 * end of the range's last ayah plus RANGE_STOP_LAG_MS. A missing timing for that ayah, or no range, never stops it.
 */
export function rangeStopAction(range: RangePlay | null, timings: readonly AyahTiming[], positionMs: number): RangeStopAction {
  if (range === null) {
    return 'none';
  }
  const last = findVerse(timings, range.toVerseId);
  if (last === undefined) {
    return 'none';
  }
  return positionMs >= last.endMs + RANGE_STOP_LAG_MS ? 'stop' : 'none';
}
