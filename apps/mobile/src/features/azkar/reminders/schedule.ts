import { timesFor } from '@/features/salah/data/prayer-times';

/**
 * Pure scheduling math for Azkar reminders (ADR 0031 §7). A reminder time is the user's preference, never the
 * religious time of the dhikr. Prayer times come from the Salah engine (`timesFor`): there is no second engine here.
 */

export const REMINDER_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type ReminderPrayer = (typeof REMINDER_PRAYERS)[number];

export const OFFSET_MIN_MINUTES = 0;
export const OFFSET_MAX_MINUTES = 120;
export const OFFSET_STEP_MINUTES = 5;

export type Coordinates = { lat: number; lng: number };

export type ClockTrigger = { hour: number; minute: number };

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:mm` (24 hours) to an hour and minute. Null for a missing or malformed time: that reminder has no trigger yet. */
export function clockTrigger(clockTime: string | null): ClockTrigger | null {
  if (clockTime === null) {
    return null;
  }
  const match = CLOCK_PATTERN.exec(clockTime);
  if (match === null) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** The clock time string for a time-of-day, in the stored `HH:mm` form. */
export function formatClockTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isReminderPrayer(value: unknown): value is ReminderPrayer {
  return typeof value === 'string' && (REMINDER_PRAYERS as readonly string[]).includes(value);
}

/**
 * The fire dates of a prayer-relative reminder: for each day from today, the prayer's time plus the offset. Only dates
 * after `now` are kept, in order, and the list is capped at `days` entries. Without coordinates the list is empty, and
 * the caller reports that the user needs to set a location.
 */
export function prayerRelativeFireDates(
  reminder: { prayer: ReminderPrayer | null; offsetMinutes: number | null },
  now: Date,
  coords: Coordinates | null,
  days: number,
): Date[] {
  if (coords === null || reminder.prayer === null || reminder.offsetMinutes === null || days <= 0) {
    return [];
  }

  const fireDates: Date[] = [];
  // Today through `days` days ahead: one candidate per day, so `days` future entries are always reachable.
  for (let index = 0; index <= days; index += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + index);
    const prayerAt = timesFor(day, coords)[reminder.prayer].getTime();
    const fireAt = prayerAt + reminder.offsetMinutes * 60_000;
    if (Number.isFinite(fireAt) && fireAt > now.getTime()) {
      fireDates.push(new Date(fireAt));
    }
  }

  return fireDates.sort((a, b) => a.getTime() - b.getTime()).slice(0, days);
}
