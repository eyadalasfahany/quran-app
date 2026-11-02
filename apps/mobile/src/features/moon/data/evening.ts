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
  /** The evening's own facts: its civil day, the conjunction before its sunset, and the age at that sunset. */
  evening: {
    civilDay: Date;
    conjunction: Date;
    ageAtSunsetMs: number;
  };
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

  // The conjunction that ends this month: the first after mid-month. (findPreviousConjunction(sunset) could never be
  // after the sunset, so a conjunction after the day-29 sunset was missed and the evening before the new moon was used.)
  const conjunction = findNextConjunction(month.days[14]!.gregorian);
  if (evening.sunset.getTime() < conjunction.getTime()) {
    evening = sunMoonTimesForLocalDay(new Date(conjunction.getTime() + 60_000), location);
    // A conjunction later in the day than that day's sunset: the first sunset after it is the next day's.
    if (evening.sunset.getTime() <= conjunction.getTime()) {
      evening = sunMoonTimesForLocalDay(new Date(conjunction.getTime() + 24 * 3_600_000), location);
    }
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
  // The phase describes the sighting evening, not this moment: the card shows the age at that sunset next to it, so
  // the illumination and the disc are at that sunset too, and the next conjunction is the one after that evening.
  const state = moonStateAt(evening.sunset);
  const previousConjunction = findPreviousConjunction(evening.sunset);
  const nextConjunction = findNextConjunction(evening.sunset);
  const raw = estimateCrescentVisibility(evening, location);
  const estimate =
    raw.status === 'ok'
      ? {
          odehV: raw.v,
          odehZone: raw.zone,
        }
      : null;

  const conjunctionBeforeSunset = findPreviousConjunction(evening.sunset);

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
    evening: {
      civilDay: evening.civilDay,
      conjunction: conjunctionBeforeSunset,
      ageAtSunsetMs: evening.sunset.getTime() - conjunctionBeforeSunset.getTime(),
    },
  };
}
