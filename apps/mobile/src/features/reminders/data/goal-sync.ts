import { storageKeys } from '@/core/storage/mmkv';
import { readLastKnownCoordinates } from '@/features/azkar/reminders/last-known-coordinates';
import {
  currentSyncState,
  needsResync,
  readSyncState,
  writeSyncState,
  type SyncCoordinates,
} from '@/features/notifications/sync-state';
import { resolvePrayerCoordinates, savedPrayerCoordinates } from '@/features/salah/data/prayer-coordinates';

import { readFridayReminder, readMisbahaReminder } from './goal-settings';
import { type GoalScheduleResult, scheduleFridayReminder, scheduleMisbahaReminder } from './goal-schedule';

/**
 * Keeps the Friday and misbaha notifications in step with the day, the time zone, the location and the settings (ADR 0034).
 * Entry points: app start, a return to the foreground when the day, the zone or the coordinates moved, and every edit.
 * The location is read only when the Friday reminder uses the Dhuhr time: a clock reminder never asks for a fix.
 */

export type GoalSyncResult = { friday: GoalScheduleResult; misbaha: GoalScheduleResult };

function needsLocation(): boolean {
  const friday = readFridayReminder();
  return friday.enabled && friday.mode === 'dhuhr';
}

/** Re-plans both goal reminders from the stored settings, then records the day, zone and coordinates it used. */
export async function syncGoalReminders({ now, coords }: { now: Date; coords: SyncCoordinates | null }): Promise<GoalSyncResult> {
  const friday = await scheduleFridayReminder(readFridayReminder(), now, coords);
  const misbaha = await scheduleMisbahaReminder(readMisbahaReminder());
  writeSyncState(storageKeys.reminders.goalsSync, currentSyncState(now, coords));
  return { friday, misbaha };
}

// Syncs never interleave: a launch, a foreground check and an edit can start together, and each cancel-then-schedule must
// finish before the next one reads the pending list.
let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

/** Re-plans now (launch, an edit). Errors are logged, never thrown into the UI. Resolves to null when it failed. */
export function resyncGoalReminders(now: Date = new Date()): Promise<GoalSyncResult | null> {
  return serialized(async () => {
    try {
      const coords = needsLocation() ? (await resolvePrayerCoordinates()).coords : null;
      return await syncGoalReminders({ now, coords });
    } catch (error) {
      console.error(error);
      return null;
    }
  });
}

/**
 * Re-plans only when the day, the zone or the coordinates moved since the last sync, or nothing was synced yet. A foreground
 * check never asks for a new GPS fix: it uses the last known position. Resolves to whether a sync ran.
 */
export function resyncGoalRemindersIfNeeded(now: Date = new Date()): Promise<boolean> {
  return serialized(async () => {
    try {
      const coords = needsLocation() ? ((await readLastKnownCoordinates()) ?? savedPrayerCoordinates()) : null;
      const previous = readSyncState(storageKeys.reminders.goalsSync);
      if (previous !== null && !needsResync(previous, currentSyncState(now, coords))) {
        return false;
      }
      await syncGoalReminders({ now, coords });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });
}
