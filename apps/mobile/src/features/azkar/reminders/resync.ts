import { getCoordinates } from '@/features/salah/data/location';

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

/** The coordinates the sync needs: only an enabled prayer-relative reminder reads the location. */
async function coordinatesFor(): Promise<Coordinates | null> {
  const needsLocation = listReminders().some((reminder) => reminder.enabled && reminder.triggerType === 'prayer_relative');
  return needsLocation ? getCoordinates() : null;
}

/** Runs the sync now. Resolves to whether a location is still needed and which reminders were left unscheduled, or null when nothing was scheduled or it failed. */
export async function resyncAzkarReminders(now: Date = new Date()): Promise<{ needsLocation: boolean; unscheduled: string[] } | null> {
  try {
    if (!hasLiveReminders()) {
      return null;
    }
    return await syncAzkarReminders({ now, coords: await coordinatesFor() });
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** Runs the sync only when the day, the time zone or the coordinates moved since the last one (foreground check). */
export async function resyncAzkarRemindersIfNeeded(now: Date = new Date()): Promise<boolean> {
  try {
    if (!hasLiveReminders()) {
      return false;
    }
    const coords = await coordinatesFor();
    if (!needsAzkarResync(readRemindersSyncState(), currentSyncState(now, coords))) {
      return false;
    }
    await syncAzkarReminders({ now, coords });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
