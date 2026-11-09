import { updateRenewReminder } from '@/features/notifications/renew';
import { coordsFromKey } from '@/features/notifications/sync-state';
import { resolvePrayerCoordinates, savedPrayerCoordinates } from '@/features/salah/data/prayer-coordinates';

import { readLastKnownCoordinates } from './last-known-coordinates';
import { listReminders } from './reminders-repository';
import { syncAzkarReminders } from './reminder-service';
import { currentSyncState, needsAzkarResync, readRemindersSyncState } from './resync-state';
import type { Coordinates } from './schedule';

/**
 * The entry points that run the Azkar reminder sync (ADR 0031 §7): app start, a return to the foreground when the day,
 * the time zone or the coordinates changed, and after any reminder edit. Coordinates come from the Salah location, so
 * a manual city and automatic GPS both count. Errors are logged, never thrown into the UI: a reminder sync must not
 * break a tap.
 *
 * Nothing runs when no reminder is scheduled, and the location is read only for prayer-relative reminders: a GPS fix
 * is never requested for a clock reminder or for nothing.
 */

/** Whether any reminder has notifications to plan or to cancel (an enabled one, or stale ids from a disabled one). */
function hasLiveReminders(): boolean {
  return listReminders().some((reminder) => reminder.enabled || reminder.notificationIds.length > 0);
}

/** Whether an enabled prayer-relative reminder needs the location. Clock reminders never do. */
function needsLocation(): boolean {
  return listReminders().some((reminder) => reminder.enabled && reminder.triggerType === 'prayer_relative');
}

/**
 * The coordinates the last sync was made from. A sync that cannot read the location uses them, so a missing fix never
 * wipes the prayer-relative reminders (ADR 0083).
 */
function lastSyncedCoordinates(): Coordinates | null {
  return coordsFromKey(readRemindersSyncState()?.coordsKey);
}

/** The coordinates the sync needs: only an enabled prayer-relative reminder reads the location (ADR 0086 fallback). */
async function coordinatesFor(): Promise<Coordinates | null> {
  return needsLocation() ? ((await resolvePrayerCoordinates()).coords ?? lastSyncedCoordinates()) : null;
}

/**
 * The foreground check's coordinates: the last known position or the manual city, never a new fix, then the saved
 * place, then the last sync's coordinates.
 */
async function foregroundCoords(): Promise<Coordinates | null> {
  return (await readLastKnownCoordinates()) ?? savedPrayerCoordinates() ?? lastSyncedCoordinates();
}

/** As `coordinatesFor`, but for a foreground check. */
async function foregroundCoordinatesFor(): Promise<Coordinates | null> {
  return needsLocation() ? foregroundCoords() : null;
}

/** Runs the sync now. Resolves to whether a location is still needed and which reminders were left unscheduled, or null when nothing was scheduled or it failed. */
export async function resyncAzkarReminders(now: Date = new Date()): Promise<{ needsLocation: boolean; unscheduled: string[] } | null> {
  try {
    if (!hasLiveReminders()) {
      await updateRenewReminder('azkar', null, now);
      return null;
    }
    return await syncAzkarReminders({ now, coords: await coordinatesFor() });
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Runs the sync only when the day, the time zone or the coordinates moved since the last one (foreground check).
 *
 * The check is ordered so a foreground return reads as little as it can. The day and the time zone come from the stored
 * state, so a change there re-plans with no location read first. The coordinates are read only when a prayer-relative
 * reminder needs them, and then only from the last known position or the manual city: a foreground check never asks
 * the device for a new GPS fix.
 */
export async function resyncAzkarRemindersIfNeeded(now: Date = new Date()): Promise<boolean> {
  try {
    if (!hasLiveReminders()) {
      await updateRenewReminder('azkar', null, now);
      return false;
    }
    const previous = readRemindersSyncState();
    const today = currentSyncState(now, null);
    const dayOrZoneChanged = previous === null || previous.day !== today.day || previous.timeZone !== today.timeZone;
    if (dayOrZoneChanged) {
      const coords = await foregroundCoordinatesFor();
      await syncAzkarReminders({ now, coords });
      return true;
    }

    // Same day and zone: only the location can have moved, and only a prayer-relative reminder uses it.
    if (!needsLocation()) {
      return false;
    }
    const coords = await foregroundCoords();
    if (!needsAzkarResync(previous, currentSyncState(now, coords))) {
      return false;
    }
    await syncAzkarReminders({ now, coords });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
