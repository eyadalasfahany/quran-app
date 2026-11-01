import { storageKeys } from '@/core/storage/mmkv';
import {
  currentSyncState as sharedCurrentSyncState,
  needsResync,
  readSyncState,
  writeSyncState,
  type ScheduleSyncState,
  type SyncCoordinates,
} from '@/features/notifications/sync-state';

import type { Coordinates } from './schedule';

/**
 * What the last Azkar reminder sync was computed for. The generic shape and the comparison live in the shared
 * `notifications/sync-state` module (the Salah prayer notifications use the same rule); this file keeps the Azkar
 * names and the Azkar storage key.
 */
export type RemindersSyncState = ScheduleSyncState;

export { coordsKey, localDay } from '@/features/notifications/sync-state';

export function currentSyncState(now: Date, coords: Coordinates | null): RemindersSyncState {
  return sharedCurrentSyncState(now, coords as SyncCoordinates | null);
}

/** True when the date, the time zone or the coordinates changed since `previous`, or nothing was synced yet. */
export const needsAzkarResync = needsResync;

/** The last recorded sync, or null when none is recorded or the stored value is unreadable. */
export function readRemindersSyncState(): RemindersSyncState | null {
  return readSyncState(storageKeys.azkar.remindersSync);
}

export function writeRemindersSyncState(state: RemindersSyncState): void {
  writeSyncState(storageKeys.azkar.remindersSync, state);
}
