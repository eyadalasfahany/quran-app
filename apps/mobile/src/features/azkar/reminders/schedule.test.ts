import { timesFor } from '@/features/salah/data/prayer-times';

import {
  clockTrigger,
  formatClockTime,
  isReminderPrayer,
  prayerRelativeFireDates,
  type Coordinates,
} from './schedule';

// London, the DST fixture: the clocks go back on Sunday 2026-10-25.
const LONDON: Coordinates = { lat: 51.5074, lng: -0.1278 };
const MS_PER_MINUTE = 60_000;

/** A local wall-clock instant: the engine works in the process's local calendar, as the Salah engine does. */
function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function dayOffset(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function londonWallClock(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function londonDay(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit' }).format(date);
}

describe('clockTrigger', () => {
  it('reads an HH:mm time into hour and minute', () => {
    expect(clockTrigger('06:30')).toEqual({ hour: 6, minute: 30 });
    expect(clockTrigger('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it.each(['24:00', '12:60', '6:30', 'morning', '', null])('has no trigger for %s', (value) => {
    expect(clockTrigger(value)).toBeNull();
  });

  it('formats a time back to the stored form', () => {
    expect(formatClockTime(6, 5)).toBe('06:05');
    expect(formatClockTime(21, 0)).toBe('21:00');
  });
});

describe('isReminderPrayer', () => {
  it('accepts the five obligatory prayers and rejects sunrise and anything else', () => {
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(isReminderPrayer(prayer)).toBe(true);
    }
    expect(isReminderPrayer('sunrise')).toBe(false);
    expect(isReminderPrayer(null)).toBe(false);
  });
});

describe('prayerRelativeFireDates', () => {
  const now = local(2026, 10, 31, 12, 0);

  it('returns the prayer time of each day plus the offset, in order', () => {
    const fires = prayerRelativeFireDates({ prayer: 'asr', offsetMinutes: 10 }, now, LONDON, 4);

    expect(fires).toHaveLength(4);
    expect(fires[0]?.getTime()).toBe(timesFor(now, LONDON).asr.getTime() + 10 * MS_PER_MINUTE);
    for (let index = 1; index < fires.length; index += 1) {
      expect(fires[index]!.getTime()).toBeGreaterThan(fires[index - 1]!.getTime());
    }
  });

  it('keeps a rolling window of days, one fire date per day', () => {
    const fires = prayerRelativeFireDates({ prayer: 'maghrib', offsetMinutes: 0 }, now, LONDON, 4);

    const days = new Set(fires.map((fire) => `${fire.getFullYear()}-${fire.getMonth()}-${fire.getDate()}`));
    expect(fires).toHaveLength(4);
    expect(days.size).toBe(4);
    expect(fires[3]!.getTime()).toBe(timesFor(dayOffset(now, 3), LONDON).maghrib.getTime());
  });

  it('skips a prayer that has already passed today', () => {
    const lateEvening = local(2026, 10, 31, 23, 59);
    const fires = prayerRelativeFireDates({ prayer: 'isha', offsetMinutes: 0 }, lateEvening, LONDON, 4);

    expect(fires).toHaveLength(4);
    expect(fires.every((fire) => fire.getTime() > lateEvening.getTime())).toBe(true);
    expect(fires[0]?.getTime()).toBe(timesFor(dayOffset(lateEvening, 1), LONDON).isha.getTime());
  });

  it('never returns a date at or before now', () => {
    const fires = prayerRelativeFireDates({ prayer: 'fajr', offsetMinutes: 0 }, now, LONDON, 4);

    expect(fires.every((fire) => fire.getTime() > now.getTime())).toBe(true);
  });

  it('caps the list at the window size', () => {
    expect(prayerRelativeFireDates({ prayer: 'dhuhr', offsetMinutes: 5 }, now, LONDON, 2)).toHaveLength(2);
    expect(prayerRelativeFireDates({ prayer: 'dhuhr', offsetMinutes: 5 }, now, LONDON, 0)).toEqual([]);
  });

  it('stays one fire per day across the London clock change of 2026-10-25', () => {
    const before = local(2026, 10, 24, 12, 0);
    const fires = prayerRelativeFireDates({ prayer: 'maghrib', offsetMinutes: 0 }, before, LONDON, 4);

    expect(fires).toHaveLength(4);
    // Each fire is the Salah engine's time for its own local day (today's, still ahead at noon, is the first).
    fires.forEach((fire, index) => {
      expect(fire.getTime()).toBe(timesFor(dayOffset(before, index), LONDON).maghrib.getTime());
    });
    // The window covers the 25th: one fire on each of the four days, none doubled across the change.
    // Read on the London calendar, so the check does not depend on the machine's own zone.
    expect(fires.map((fire) => londonDay(fire))).toEqual(['24', '25', '26', '27']);
    // The Maghrib wall clock in London stays in the evening on both sides of the change.
    for (const fire of fires) {
      const [hour] = londonWallClock(fire).split(':').map(Number);
      expect(hour).toBeGreaterThanOrEqual(15);
      expect(hour).toBeLessThanOrEqual(18);
    }
  });

  it('returns nothing without coordinates', () => {
    expect(prayerRelativeFireDates({ prayer: 'asr', offsetMinutes: 10 }, now, null, 4)).toEqual([]);
  });

  it('returns nothing until a prayer and an offset are chosen', () => {
    expect(prayerRelativeFireDates({ prayer: null, offsetMinutes: 0 }, now, LONDON, 4)).toEqual([]);
    expect(prayerRelativeFireDates({ prayer: 'asr', offsetMinutes: null }, now, LONDON, 4)).toEqual([]);
  });
});
