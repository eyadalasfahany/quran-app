import { timesFor, type PrayerTimesOutput } from '@/features/salah/data/prayer-times';

import type { PrayerEntry, PrayerKey } from './types';

/** Today and the two days after it: 15 instants, at least 48 hours from any moment on the first day (ADR 0035 §4). */
export const PRAYER_TIMELINE_DAYS = 3;

// Sunrise is a time marker, not a prayer (the same rule as `nextPrayer`).
const PRAYER_KEYS: readonly PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type PrayerTimeline = { entries: PrayerEntry[]; validUntil: number | null };

/**
 * The prayer instants for the local day of `now` and the following days, from the same `timesFor` the app uses, so a
 * widget time equals the app's time. Instants that do not exist (adhan returns an invalid date at extreme latitudes)
 * are left out. No coordinates leave this function.
 */
export function prayerTimelineFor(
  now: Date,
  coords: { lat: number; lng: number } | null,
  days: number = PRAYER_TIMELINE_DAYS,
): PrayerTimeline {
  if (coords === null) {
    return { entries: [], validUntil: null };
  }
  const entries: PrayerEntry[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    // Noon on each local day: adhan reads only the local date, so noon gives that day's times in any time zone.
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12, 0, 0, 0);
    entries.push(...entriesOfDay(timesFor(day, coords)));
  }
  entries.sort((a, b) => a.at - b.at);
  const last = entries[entries.length - 1];
  return { entries, validUntil: last === undefined ? null : last.at };
}

function entriesOfDay(times: PrayerTimesOutput): PrayerEntry[] {
  const result: PrayerEntry[] = [];
  for (const key of PRAYER_KEYS) {
    const at = times[key].getTime();
    if (Number.isFinite(at)) {
      result.push({ at, key });
    }
  }
  return result;
}
