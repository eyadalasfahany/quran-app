import { timesFor, qiblaBearing, nextPrayer, prevPrayer, distanceToMakkahKm } from '../data/prayer-times';

describe('prayer-times data module', () => {
  const fixedDate = new Date('2026-10-27T12:00:00Z'); // A fixed date for consistent testing

  it('should calculate prayer times for Riyadh accurately', () => {
    const riyadhCoords = { lat: 24.7136, lng: 46.6753 };
    const times = timesFor(fixedDate, riyadhCoords);

    // Umm al-Qura / Shafi times for Riyadh on 2026-10-27 (Riyadh is UTC+3)
    const expectedFajr = new Date('2026-10-27T01:38:00.000Z'); // 04:38 local
    const expectedSunrise = new Date('2026-10-27T02:57:00.000Z'); // 05:57 local
    const expectedDhuhr = new Date('2026-10-27T08:37:00.000Z'); // 11:37 local
    const expectedAsr = new Date('2026-10-27T11:51:00.000Z'); // 14:51 local (Shafi)
    const expectedMaghrib = new Date('2026-10-27T14:17:00.000Z'); // 17:17 local
    const expectedIsha = new Date('2026-10-27T15:47:00.000Z'); // 18:47 local

    const withinTwoMinutes = (actual: Date, expected: Date) => {
      return Math.abs(actual.getTime() - expected.getTime()) <= 2 * 60 * 1000;
    };

    expect(withinTwoMinutes(times.fajr, expectedFajr)).toBe(true);
    expect(withinTwoMinutes(times.sunrise, expectedSunrise)).toBe(true);
    expect(withinTwoMinutes(times.dhuhr, expectedDhuhr)).toBe(true);
    expect(withinTwoMinutes(times.asr, expectedAsr)).toBe(true);
    expect(withinTwoMinutes(times.maghrib, expectedMaghrib)).toBe(true);
    expect(withinTwoMinutes(times.isha, expectedIsha)).toBe(true);

    // Assert ordering
    expect(times.fajr.getTime()).toBeLessThan(times.sunrise.getTime());
    expect(times.sunrise.getTime()).toBeLessThan(times.dhuhr.getTime());
    expect(times.dhuhr.getTime()).toBeLessThan(times.asr.getTime());
    expect(times.asr.getTime()).toBeLessThan(times.maghrib.getTime());
    expect(times.maghrib.getTime()).toBeLessThan(times.isha.getTime());
  });

  it('should calculate qibla bearing accurately', () => {
    const jakartaCoords = { lat: -6.2088, lng: 106.8456 };
    const londonCoords = { lat: 51.5074, lng: -0.1278 };

    const qiblaJakarta = qiblaBearing(jakartaCoords);
    const qiblaLondon = qiblaBearing(londonCoords);

    // True bearings: Jakarta ≈ 295.1°, London ≈ 119.0°
    expect(qiblaJakarta).toBeCloseTo(295.1, 0);
    expect(qiblaLondon).toBeCloseTo(119.0, 0);
  });

  it('should determine the next prayer and handle rollover', () => {
    const riyadhCoords = { lat: 24.7136, lng: 46.6753 };
    const times = timesFor(fixedDate, riyadhCoords);

    // Just before Dhuhr (dhuhr is 08:37Z / 11:37 local)
    const beforeDhuhr = new Date(fixedDate);
    beforeDhuhr.setUTCHours(8, 30, 0, 0); // 11:30 local
    let next = nextPrayer(times, beforeDhuhr, riyadhCoords);
    expect(next?.name).toBe('dhuhr');
    expect(next?.time.toISOString()).toBe(times.dhuhr.toISOString());

    // Between Fajr and Shurouq — الشروق is a marker, not a prayer
    const afterFajr = new Date(fixedDate);
    afterFajr.setUTCHours(2, 0, 0, 0); // 05:00 local, after Fajr (04:38) before Shurouq (05:57)
    next = nextPrayer(times, afterFajr, riyadhCoords);
    expect(next?.name).toBe('dhuhr');

    // Just after Isha (should rollover to tomorrow's Fajr)
    const afterIsha = new Date(fixedDate);
    afterIsha.setUTCHours(17, 0, 0, 0); // 08:00 PM local
    next = nextPrayer(times, afterIsha, riyadhCoords);
    const tomorrowFajr = timesFor(new Date('2026-10-28T12:00:00Z'), riyadhCoords).fajr;

    expect(next?.name).toBe('fajr');
    expect(next?.time.toISOString()).toBe(tomorrowFajr.toISOString());
  });

  it('should determine the previous prayer, spanning midnight with yesterday isha', () => {
    const riyadhCoords = { lat: 24.7136, lng: 46.6753 };
    const times = timesFor(fixedDate, riyadhCoords);

    // Between Dhuhr and Asr (dhuhr 08:37Z, asr 11:51Z)
    const midAfternoon = new Date(fixedDate);
    midAfternoon.setUTCHours(10, 0, 0, 0);
    let prev = prevPrayer(times, midAfternoon, riyadhCoords);
    expect(prev.name).toBe('dhuhr');
    expect(prev.time.toISOString()).toBe(times.dhuhr.toISOString());

    // After Isha: prev is isha itself
    const night = new Date(fixedDate);
    night.setUTCHours(17, 0, 0, 0);
    prev = prevPrayer(times, night, riyadhCoords);
    expect(prev.name).toBe('isha');
    expect(prev.time.toISOString()).toBe(times.isha.toISOString());

    // Before Fajr (fajr 01:38Z): prev is yesterday's isha
    const beforeFajr = new Date(fixedDate);
    beforeFajr.setUTCHours(0, 30, 0, 0);
    prev = prevPrayer(times, beforeFajr, riyadhCoords);
    const yesterdayIsha = timesFor(new Date('2026-10-26T12:00:00Z'), riyadhCoords).isha;
    expect(prev.name).toBe('isha');
    expect(prev.time.toISOString()).toBe(yesterdayIsha.toISOString());

    // Between Fajr and Shurouq: prev is fajr (الشروق is not a prayer)
    const afterFajr = new Date(fixedDate);
    afterFajr.setUTCHours(2, 0, 0, 0);
    prev = prevPrayer(times, afterFajr, riyadhCoords);
    expect(prev.name).toBe('fajr');
  });

  it('should calculate distance to Makkah correctly', () => {
    const makkahCoords = { lat: 21.4225, lng: 39.8262 };
    const jeddahCoords = { lat: 21.4858, lng: 39.1925 }; // ~70 km from Makkah

    const distMakkahToMakkah = distanceToMakkahKm(makkahCoords);
    expect(distMakkahToMakkah).toBeCloseTo(0, 0); // Almost 0 km

    const distMakkahToJeddah = distanceToMakkahKm(jeddahCoords);
    expect(distMakkahToJeddah).toBeCloseTo(66, 0); // ~66 km great-circle
  });
});
