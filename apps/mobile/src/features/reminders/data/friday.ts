import { type ClockTrigger } from '@/features/azkar/reminders/schedule';
import type { SyncCoordinates } from '@/features/notifications/sync-state';
import { timesFor } from '@/features/salah/data/prayer-times';

import type { FridayReminder } from './goal-settings';

/**
 * The Friday Surat al-Kahf reminder (ADR 0034, 2 Nov 2026). It is one weekly repeating notification at a clock time. The
 * default clock time is the Dhuhr of the coming Friday, read from the on-device Salah engine, so it moves with the
 * season and the location; the sync re-plans it each day. Pure: the clock is passed in.
 */

/** `Date.getDay()` for a Friday: Sunday is 0. */
export const FRIDAY_DAY_INDEX = 5;

/** The weekly trigger's weekday for a Friday: Sunday is 1 (expo-notifications, `WEEKLY`). */
export const FRIDAY_WEEKDAY = 6;

/** The reader at Surat al-Kahf (18), first verse. The deep link allowlist accepts `/read/`. */
export const KAHF_ROUTE = '/read/18:1';

/**
 * The first Friday strictly after the local day of `now`, at local midnight. A Friday never counts as «this Friday» here:
 * the weekly trigger fires on the next Friday, so the Dhuhr time is the one for that day. Built with the Date constructor,
 * so the calendar day is local and a DST change never moves it by an hour.
 */
export function nextFriday(now: Date): Date {
  const daysAhead = ((FRIDAY_DAY_INDEX - now.getDay() + 7) % 7) || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
}

/**
 * The Dhuhr clock time of the next Friday, rounded to the minute. Null without coordinates or when the engine gives no
 * finite time (a polar day, for example).
 */
export function fridayDhuhrClock(now: Date, coords: SyncCoordinates | null): ClockTrigger | null {
  if (coords === null) {
    return null;
  }
  const dhuhrMs = timesFor(nextFriday(now), coords).dhuhr.getTime();
  if (!Number.isFinite(dhuhrMs)) {
    return null;
  }
  const rounded = new Date(Math.round(dhuhrMs / 60_000) * 60_000);
  return { hour: rounded.getHours(), minute: rounded.getMinutes() };
}

/** The clock time the Friday reminder fires at: the Dhuhr (needs coordinates) or the time the user chose. */
export function fridayClock(settings: FridayReminder, now: Date, coords: SyncCoordinates | null): ClockTrigger | null {
  if (settings.mode === 'dhuhr') {
    return fridayDhuhrClock(now, coords);
  }
  if (settings.clockTime === null) {
    return null;
  }
  const [hour, minute] = settings.clockTime.split(':').map(Number);
  return hour === undefined || minute === undefined ? null : { hour, minute };
}
