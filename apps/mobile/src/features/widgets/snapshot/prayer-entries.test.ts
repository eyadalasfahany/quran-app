import { timesFor } from '@/features/salah/data/prayer-times';

import { PRAYER_TIMELINE_DAYS, prayerTimelineFor } from './prayer-entries';

// Local noon, so the local date is the same on every machine.
const now = new Date(2026, 10, 2, 12, 0);
const cairo = { lat: 30.0444, lng: 31.2357 };

describe('prayerTimelineFor', () => {
  it('gives five prayers for each of three days, in time order', () => {
    const { entries } = prayerTimelineFor(now, cairo);
    expect(entries).toHaveLength(5 * PRAYER_TIMELINE_DAYS);
    const times = entries.map((entry) => entry.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('never includes sunrise: only the five prayer keys appear', () => {
    const keys = new Set(prayerTimelineFor(now, cairo).entries.map((entry) => entry.key));
    expect([...keys].sort()).toEqual(['asr', 'dhuhr', 'fajr', 'isha', 'maghrib']);
  });

  it('matches the app prayer times for each instant', () => {
    const { entries } = prayerTimelineFor(now, cairo);
    const today = timesFor(new Date(2026, 10, 2, 12), cairo);
    const fajr = entries.find((entry) => entry.key === 'fajr' && entry.at === today.fajr.getTime());
    expect(fajr).toBeDefined();
  });

  it('ends at the last instant, which is validUntil', () => {
    const { entries, validUntil } = prayerTimelineFor(now, cairo);
    expect(validUntil).toBe(entries[entries.length - 1]?.at);
  });

  it('is empty without a location, with validUntil null', () => {
    expect(prayerTimelineFor(now, null)).toEqual({ entries: [], validUntil: null });
  });

  it('writes no coordinates', () => {
    const json = JSON.stringify(prayerTimelineFor(now, cairo));
    expect(json).not.toMatch(/lat|lng/);
  });
});
