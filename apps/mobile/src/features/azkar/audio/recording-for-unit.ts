import type { AzkarRecording } from '../data/model';

/**
 * The recording of a reader unit: the first recording whose item is one of the unit's body items, in the order the
 * entry lists them. Null when none of the unit's items has a recording (the usual case today).
 */
export function recordingForUnit(
  recordings: readonly AzkarRecording[],
  bodyItemIds: readonly number[],
): AzkarRecording | null {
  return recordings.find((recording) => bodyItemIds.includes(recording.itemId)) ?? null;
}
