import { dateForDayKey, dayKeyOf, nextClockBoundary } from './clock';
import type { PrayerTimesOutput } from './prayer-times';

/** A local wall-clock instant, as the Salah engine reads it. */
const at = (hour: number, minute = 0, day = 31) => new Date(2026, 9, day, hour, minute, 0, 0);

const TIMES: PrayerTimesOutput = {
  fajr: at(4, 30),
  sunrise: at(5, 50),
  dhuhr: at(12, 10),
  asr: at(15, 20),
  maghrib: at(17, 45),
  isha: at(19, 15),
};

describe('clock helpers', () => {
  it('dayKeyOf is the local calendar day, zero-padded', () => {
    expect(dayKeyOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKeyOf(at(8, 0))).toBe('2026-10-31');
  });

  it('dateForDayKey is noon on that local day, so every moment of the day keys to it', () => {
    const noon = dateForDayKey('2026-10-31');

    expect(noon.getFullYear()).toBe(2026);
    expect(noon.getMonth()).toBe(9);
    expect(noon.getDate()).toBe(31);
    expect(noon.getHours()).toBe(12);
    expect(dayKeyOf(noon)).toBe('2026-10-31');
  });

  it('the next boundary is the first prayer still ahead of now', () => {
    expect(nextClockBoundary(at(9, 0), TIMES).getTime()).toBe(TIMES.dhuhr.getTime());
    expect(nextClockBoundary(at(12, 30), TIMES).getTime()).toBe(TIMES.asr.getTime());
  });

  it('sunrise is not a boundary: nothing on the screen changes at it', () => {
    expect(nextClockBoundary(at(5, 0), TIMES).getTime()).toBe(TIMES.dhuhr.getTime());
  });

  it('after isha the boundary is the next local midnight, when the day and the times roll over', () => {
    const midnight = new Date(2026, 9, 32, 0, 0, 0, 0);

    expect(nextClockBoundary(at(20, 0), TIMES).getTime()).toBe(midnight.getTime());
  });

  it('with no times (no location) the boundary is the next midnight', () => {
    expect(nextClockBoundary(at(9, 0), null).getTime()).toBe(new Date(2026, 9, 32, 0, 0, 0, 0).getTime());
  });
});
