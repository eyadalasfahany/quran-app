import type { AzkarRecording } from '../data/model';
import type { ReaderUnit } from '../data/reader-units';

/**
 * The Azkar player's queue and repetition rules (ADR 0031 §8, the developer's player request, 1 Nov 2026). Pure
 * decisions only; `playback.ts` applies them to the audio.
 */

/**
 * - `count` (default): each dhikr plays as many times as its sourced count, and the ring fills with the plays.
 * - `once`: one play per dhikr.
 * - `continuous`: the recording loops until the person stops it.
 */
export type AzkarRepeatMode = 'count' | 'once' | 'continuous';

export const AZKAR_REPEAT_MODES: readonly AzkarRepeatMode[] = ['count', 'once', 'continuous'];

export type AzkarQueueItem = {
  unitKey: string;
  entryKey: string;
  /** The unit's index in the reader's scope (a category or an entry). Units without a recording leave gaps. */
  unitIndex: number;
  /** The sourced count, or null when none is sourced (never read as 1). */
  requiredCount: number | null;
  recording: AzkarRecording;
  /** The unit as the reader shows it, so the full player can render its text. */
  unit: ReaderUnit;
};

/**
 * The queue of a scope: every unit with a recording, in reader order. Units without a recording are not in it, so
 * auto-advance never stops on them.
 */
export function buildAzkarQueue(
  units: readonly ReaderUnit[],
  recordingFor: (unit: ReaderUnit) => AzkarRecording | null,
): AzkarQueueItem[] {
  const queue: AzkarQueueItem[] = [];
  units.forEach((unit, unitIndex) => {
    const recording = recordingFor(unit);
    if (recording !== null) {
      queue.push({
        unitKey: unit.unitKey,
        entryKey: unit.entryKey,
        unitIndex,
        requiredCount: unit.requiredCount,
        recording,
        unit,
      });
    }
  });
  return queue;
}

/**
 * Where playback starts when the person presses play in the reader: the first queue item at or after the reader's
 * unit. When no recorded unit comes after it, the queue starts at its beginning. -1 for an empty queue.
 */
export function queueStartIndex(queue: readonly AzkarQueueItem[], currentUnitIndex: number): number {
  if (queue.length === 0) {
    return -1;
  }
  const at = queue.findIndex((item) => item.unitIndex >= currentUnitIndex);
  return at === -1 ? 0 : at;
}

/**
 * The plays of one run for a unit. `null` loops until the person stops. In `count` mode the run plays what the sourced
 * count still needs (the whole count when nothing was counted yet). A unit with no sourced count, or one already
 * complete, plays once.
 */
export function runPlays(mode: AzkarRepeatMode, requiredCount: number | null, countAtStart: number): number | null {
  if (mode === 'continuous') {
    return null;
  }
  if (mode === 'once' || requiredCount === null) {
    return 1;
  }
  return Math.max(1, requiredCount - countAtStart);
}

/**
 * The repetition shown while a unit plays: «٢ من ٣». It is the sourced count so far plus the plays that ended in this
 * run, and it never passes the count. Null when the unit has no sourced count.
 */
export function repetitionOf(
  requiredCount: number | null,
  countAtStart: number,
  playsDone: number,
): { current: number; total: number } | null {
  if (requiredCount === null) {
    return null;
  }
  return { current: Math.min(requiredCount, countAtStart + playsDone + 1), total: requiredCount };
}
