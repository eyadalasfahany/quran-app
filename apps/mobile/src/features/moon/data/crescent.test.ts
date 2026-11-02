import SunCalc from './suncalc';

import { estimateCrescentVisibility, DANJON_ARCL_DEG } from './crescent';
import type { MoonLocation, SightingEvening } from './evening';

const MAKKAH: MoonLocation = { lat: 21.4225, lng: 39.8262, utcOffsetMinutes: 180 };

function eveningOn(day: string): SightingEvening {
  const anchor = new Date(`${day}T12:00:00`);
  const sun = SunCalc.getTimes(anchor, MAKKAH.lat, MAKKAH.lng, 0, MAKKAH.utcOffsetMinutes);
  const moon = SunCalc.getMoonTimes(anchor, MAKKAH.lat, MAKKAH.lng, MAKKAH.utcOffsetMinutes);
  return {
    civilDay: anchor,
    sunset: sun.sunset!,
    moonset: moon.set ?? null,
    moonrise: moon.rise ?? null,
    moonsetBeforeSunset:
      moon.set !== undefined && sun.sunset !== null && moon.set !== null && moon.set.getTime() < sun.sunset.getTime(),
  };
}

describe('estimateCrescentVisibility', () => {
  it('Makkah 9 Nov 2026: zone D with V near ADR −7.8 (Danjon ARCL)', () => {
    const result = estimateCrescentVisibility(eveningOn('2026-11-09'), MAKKAH);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.arclDeg).toBeLessThan(DANJON_ARCL_DEG + 0.2);
    expect(result.zone).toBe('D');
    expect(result.v).toBeGreaterThan(-9);
    expect(result.v).toBeLessThan(-2);
  });

  it('Makkah 10 Nov 2026: zone A/B with positive V after refraction removal', () => {
    const result = estimateCrescentVisibility(eveningOn('2026-11-10'), MAKKAH);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.v).toBeGreaterThan(2);
    expect(['A', 'B']).toContain(result.zone);
  });

  it('returns unavailable outside the fitted latitude band', () => {
    const evening = eveningOn('2026-11-10');
    const polar: MoonLocation = { lat: 75, lng: 0, utcOffsetMinutes: 0 };
    expect(estimateCrescentVisibility(evening, polar).status).toBe('unavailable');
  });

  it('completes within 100 ms', () => {
    const evening = eveningOn('2026-11-10');
    const start = performance.now();
    for (let i = 0; i < 50; i += 1) {
      estimateCrescentVisibility(evening, MAKKAH);
    }
    expect(performance.now() - start).toBeLessThan(100);
  });
});
