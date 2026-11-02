/**
 * M1 gate: SunCalc vs astronomy-engine (dev-only). NASA GSFC fixtures in __fixtures__.
 * @see https://eclipse.gsfc.nasa.gov/phase/phases248.html
 */

import * as Astronomy from 'astronomy-engine';
import SunCalc, { getMoonPosition } from './suncalc';

import { findConjunctionNear } from './conjunction';
import eveningsFixture from './__fixtures__/evenings.json';
import newMoonsFixture from './__fixtures__/new-moons.json';
import { geometricAltitude } from './refraction';

const ALT_TOLERANCE_DEG = 0.05;
const CONJUNCTION_TOLERANCE_MS = 10 * 60_000;

function moonGeometricAe(date: Date, lat: number, lng: number): number {
  const observer = new Astronomy.Observer(lat, lng, 0);
  const equ = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec);
  return hor.altitude;
}

function moonGeometricSuncalc(date: Date, lat: number, lng: number): number {
  return geometricAltitude(getMoonPosition(date, lat, lng).altitude);
}

function aeNewMoon(iso: string): Date {
  const start = new Date(new Date(iso).getTime() - 5 * 86_400_000);
  const found = Astronomy.SearchMoonPhase(0, start, 40);
  if (!found) {
    throw new Error('SearchMoonPhase returned null');
  }
  return found.date;
}

describe('M1 gate', () => {
  it('documents the NASA GSFC fixture source URL', () => {
    expect(newMoonsFixture.meta.nasaMoonPhaseTableUrl).toContain('eclipse.gsfc.nasa.gov');
    expect(newMoonsFixture.newMoons).toHaveLength(24);
    expect(eveningsFixture.evenings).toHaveLength(100);
  });

  it('matches geometric moon altitude within 0.05° at 100 evening sunsets', () => {
    let maxDelta = 0;
    for (const row of eveningsFixture.evenings) {
      const at = new Date(row.sunsetIso);
      maxDelta = Math.max(
        maxDelta,
        Math.abs(moonGeometricSuncalc(at, row.lat, row.lng) - moonGeometricAe(at, row.lat, row.lng)),
      );
    }
    expect(maxDelta).toBeLessThanOrEqual(ALT_TOLERANCE_DEG);
  });

  it('matches new-moon conjunction within 10 minutes for 24 fixtures', () => {
    let maxDeltaMs = 0;
    for (const row of newMoonsFixture.newMoons) {
      const center = new Date(row.iso);
      const ae = aeNewMoon(row.iso);
      const sc = findConjunctionNear(center);
      maxDeltaMs = Math.max(maxDeltaMs, Math.abs(sc.getTime() - ae.getTime()));
    }
    expect(maxDeltaMs).toBeLessThanOrEqual(CONJUNCTION_TOLERANCE_MS);
  });

  it('sunset and moonset within one minute for Cairo and Makkah (2026-11-10)', () => {
    const MINUTE_MS = 60_000;
    const cases = [
      { lat: 30.0444, lng: 31.2357, utcOffsetMinutes: 120, day: '2026-11-10' },
      { lat: 21.4225, lng: 39.8262, utcOffsetMinutes: 180, day: '2026-11-10' },
    ] as const;
    for (const city of cases) {
      const anchor = new Date(`${city.day}T12:00:00`);
      const sun = SunCalc.getTimes(anchor, city.lat, city.lng, 0, city.utcOffsetMinutes);
      const moon = SunCalc.getMoonTimes(anchor, city.lat, city.lng, city.utcOffsetMinutes);
      const observer = new Astronomy.Observer(city.lat, city.lng, 0);
      const dayStart = new Date(`${city.day}T00:00:00Z`);
      const sunSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, dayStart, 1);
      const moonSet = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, dayStart, 1);
      expect(Math.abs(sun.sunset!.getTime() - sunSet!.date.getTime())).toBeLessThanOrEqual(MINUTE_MS);
      expect(Math.abs(moon.set!.getTime() - moonSet!.date.getTime())).toBeLessThanOrEqual(MINUTE_MS);
    }
  });
});
