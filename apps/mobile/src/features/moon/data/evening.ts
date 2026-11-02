import SunCalc from './suncalc';

import { toHijri } from '@/features/hijri/data/hijri-date';
import { hijriMonth } from '@/features/hijri/data/month';

import { estimateCrescentVisibility, type VisibilityZone } from './crescent';
import { findNextConjunction, findPreviousConjunction } from './conjunction';
import { moonStateAt } from './moon-state';

export type MoonLocation = {
  lat: number;
  lng: number;
  /** Minutes east of UTC, as suncalc expects. */
  utcOffsetMinutes: number;
};

export type SightingEvening = {
  /** Local civil day used for rise/set tables. */
  civilDay: Date;
  sunset: Date;
  moonset: Date | null;
  moonrise: Date | null;
  /** True when the moon sets before the sun on this evening. */
  moonsetBeforeSunset: boolean;
};

export type MoonEveningContext = {
  phase: {
    illumination: number;
    waxing: boolean;
    ageDays: number;
    previousConjunction: Date;
    nextConjunction: Date;
  };
  times: {
    sunset: Date;
    moonset: Date | null;
    moonrise: Date | null;
  };
  estimate: {
    odehV: number;
    odehZone: VisibilityZone;
  } | null;
};

function sunMoonTimesForLocalDay(dayAtLocalNoon: Date, location: MoonLocation): SightingEvening {
  const sun = SunCalc.getTimes(dayAtLocalNoon, location.lat, location.lng, 0, location.utcOffsetMinutes);
  const moon = SunCalc.getMoonTimes(dayAtLocalNoon, location.lat, location.lng, location.utcOffsetMinutes);
  const sunset = sun.sunset;
  if (!sunset) {
    throw new Error('Sunset unavailable for latitude');
  }
  const moonset = moon.set ?? null;
  const moonrise = moon.rise ?? null;
  const moonsetBeforeSunset = moonset !== null && moonset.getTime() < sunset.getTime();
  return { civilDay: dayAtLocalNoon, sunset, moonset, moonrise, moonsetBeforeSunset };
}

/**
 * The evening to evaluate for crescent visibility: sunset on the 29th of the current adjusted Hijri month, or the
 * first sunset after conjunction when that falls on a different day (ADR 0043 C2).
 */
export function sightingEveningForDate(
  onDay: Date,
  adjustDays: number,
  location: MoonLocation,
): SightingEvening | null {
  const hijri = toHijri(onDay, adjustDays);
  if (!hijri) {
    return null;
  }
  const month = hijriMonth(hijri.year, hijri.month, adjustDays);
  if (!month) {
    return null;
  }
  const day29 = month.days[Math.min(28, month.length - 1)]!.gregorian;
  let evening = sunMoonTimesForLocalDay(day29, location);

  const conjunction = findPreviousConjunction(evening.sunset);
  if (evening.sunset.getTime() < conjunction.getTime()) {
    const after = new Date(conjunction.getTime() + 60_000);
    evening = sunMoonTimesForLocalDay(after, location);
  }

  return evening;
}

/** Device time zone offset in minutes east of UTC (suncalc sign). */
export function utcOffsetMinutesEast(at: Date): number {
  return -at.getTimezoneOffset();
}

/** Full moon-sighting context for the UI at `now` (device time zone for rise/set tables). */
export function buildMoonEvening(
  now: Date,
  lat: number,
  lng: number,
  adjustDays: number,
): MoonEveningContext | null {
  const location: MoonLocation = { lat, lng, utcOffsetMinutes: utcOffsetMinutesEast(now) };
  const evening = sightingEveningForDate(now, adjustDays, location);
  if (!evening) {
    return null;
  }
  const state = moonStateAt(now);
  const previousConjunction = findPreviousConjunction(now);
  const nextConjunction = findNextConjunction(now);
  const raw = estimateCrescentVisibility(evening, location);
  const estimate =
    raw.status === 'ok'
      ? {
          odehV: raw.v,
          odehZone: raw.zone,
        }
      : null;

  return {
    phase: {
      illumination: state.illumination,
      waxing: state.waxing,
      ageDays: state.ageHours / 24,
      previousConjunction,
      nextConjunction,
    },
    times: {
      sunset: evening.sunset,
      moonset: evening.moonset,
      moonrise: evening.moonrise,
    },
    estimate,
  };
}
