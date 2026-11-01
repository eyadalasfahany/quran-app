import { localDay } from '@/features/notifications/sync-state';

import type { PrayerTimesOutput } from './prayer-times';

/** The local calendar day of `date` as `YYYY-MM-DD`: the key the day's prayer times are memoised on. */
export function dayKeyOf(date: Date): string {
  return localDay(date);
}

/**
 * Noon, local, on the day `key` names. adhan reads only the local year, month and day, so noon gives the same times as
 * any other moment that day, and a memo keyed on the day never needs the exact time.
 */
export function dateForDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * The next moment the prayer screen's state can change: the first of today's prayer times still ahead of `now`, or the
 * next local midnight (when the day, and so the times, roll over). Sunrise changes nothing on the screen, so it is left
 * out.
 */
export function nextClockBoundary(now: Date, times: PrayerTimesOutput | null): Date {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  let boundary = midnight.getTime();
  if (times !== null) {
    for (const name of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      const ms = times[name].getTime();
      if (ms > now.getTime() && ms < boundary) {
        boundary = ms;
      }
    }
  }
  return new Date(boundary);
}
