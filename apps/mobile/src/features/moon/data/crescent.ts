import SunCalc from './suncalc';

import { geometricAltitude } from './refraction';
import type { MoonLocation, SightingEvening } from './evening';

/** Odeh (2004, Experimental Astronomy 18:39–64) zone thresholds for V (degrees). */
export const ODEH_ZONE_A_MIN = 5.65;
export const ODEH_ZONE_B_MIN = 2;
export const ODEH_ZONE_C_MIN = -0.96;

/** Danjon limit: below this topocentric ARCL (degrees) the crescent is treated as not visible (Odeh / Yallop). */
export const DANJON_ARCL_DEG = 6.4;

/** Yallop (1997, HMNAO Technical Note 69) intercept for the width term (arcminutes). */
const ODEH_W_INTERCEPT = 7.1651;
const ODEH_W_COEFFS = { w3: -0.1018, w2: 0.7319, w1: -6.3226 } as const;

/** Latitude band the Odeh/Yallop regression was fitted for (degrees); outside → unavailable. */
export const CRITERION_LAT_MIN = -55;
export const CRITERION_LAT_MAX = 70;

export type VisibilityZone = 'A' | 'B' | 'C' | 'D';

export type CrescentEstimate =
  | { status: 'unavailable'; reason: 'latitude' | 'danjon' | 'polar' | 'no_moonset' }
  | {
      status: 'ok';
      bestTime: Date;
      sunset: Date;
      moonset: Date | null;
      lagMinutes: number;
      /** Topocentric geometric arc of vision at best time, degrees. */
      arcvDeg: number;
      /** Topocentric angular separation (ARCL), degrees. */
      arclDeg: number;
      /** Topocentric crescent width W, arcminutes. */
      wArcmin: number;
      /** Odeh V (degrees). */
      v: number;
      zone: VisibilityZone;
      /** Yallop q (unitless), secondary detail. */
      yallopQ: number;
    };

function topocentricPosition(at: Date, lat: number, lng: number) {
  const moon = SunCalc.getMoonPosition(at, lat, lng);
  const sun = SunCalc.getPosition(at, lat, lng);
  return {
    moon: {
      azimuth: moon.azimuth,
      altitude: geometricAltitude(moon.altitude),
      distanceKm: moon.distance,
    },
    sun: {
      azimuth: sun.azimuth,
      altitude: geometricAltitude(sun.altitude),
    },
  };
}

function topocentricArcLightDeg(at: Date, lat: number, lng: number): number {
  const moon = SunCalc.getMoonPosition(at, lat, lng);
  const sun = SunCalc.getPosition(at, lat, lng);
  const hm = (moon.altitude * Math.PI) / 180;
  const hs = (sun.altitude * Math.PI) / 180;
  const d = ((moon.azimuth - sun.azimuth) * Math.PI) / 180;
  return (Math.acos(Math.sin(hm) * Math.sin(hs) + Math.cos(hm) * Math.cos(hs) * Math.cos(d)) * 180) / Math.PI;
}

function semiDiameterArcmin(distanceKm: number): number {
  return ((Math.asin(1737.4 / distanceKm) * 180) / Math.PI) * 60;
}

function crescentWidthArcmin(arclDeg: number, distanceKm: number): number {
  const arcl = (arclDeg * Math.PI) / 180;
  const sd = semiDiameterArcmin(distanceKm);
  return (sd * (1 - Math.cos(arcl))) / Math.sin(arcl);
}

function odehWidthTerm(wArcmin: number): number {
  return (
    ODEH_W_COEFFS.w3 * wArcmin ** 3 + ODEH_W_COEFFS.w2 * wArcmin ** 2 + ODEH_W_COEFFS.w1 * wArcmin + ODEH_W_INTERCEPT
  );
}

function yallopQ(arcvDeg: number, wArcmin: number): number {
  return (arcvDeg - odehWidthTerm(wArcmin)) / 10;
}

function odehV(arcvDeg: number, wArcmin: number): number {
  return arcvDeg - odehWidthTerm(wArcmin);
}

export function zoneFromOdehV(v: number): VisibilityZone {
  if (v >= ODEH_ZONE_A_MIN) {
    return 'A';
  }
  if (v >= ODEH_ZONE_B_MIN) {
    return 'B';
  }
  if (v >= ODEH_ZONE_C_MIN) {
    return 'C';
  }
  return 'D';
}

function bestTime(evening: SightingEvening): Date {
  const { sunset, moonset } = evening;
  if (!moonset) {
    return sunset;
  }
  const lag = moonset.getTime() - sunset.getTime();
  return new Date(sunset.getTime() + (4 / 9) * lag);
}

/** Odeh V estimate for the given sighting evening (ADR 0043 C2). */
export function estimateCrescentVisibility(evening: SightingEvening, location: MoonLocation): CrescentEstimate {
  if (location.lat < CRITERION_LAT_MIN || location.lat > CRITERION_LAT_MAX) {
    return { status: 'unavailable', reason: 'latitude' };
  }
  const { sunset, moonset } = evening;
  if (!moonset) {
    return { status: 'unavailable', reason: 'no_moonset' };
  }
  const tb = bestTime(evening);
  const arclDeg = topocentricArcLightDeg(tb, location.lat, location.lng);
  const pos = topocentricPosition(tb, location.lat, location.lng);
  const arcvDeg = pos.moon.altitude - pos.sun.altitude;
  const wArcmin = crescentWidthArcmin(arclDeg, pos.moon.distanceKm);
  const v = odehV(arcvDeg, wArcmin);
  let zone = zoneFromOdehV(v);
  if (arclDeg < DANJON_ARCL_DEG) {
    zone = 'D';
  }
  const lagMinutes = (moonset.getTime() - sunset.getTime()) / 60_000;
  return {
    status: 'ok',
    bestTime: tb,
    sunset,
    moonset,
    lagMinutes,
    arcvDeg,
    arclDeg,
    wArcmin,
    v,
    zone,
    yallopQ: yallopQ(arcvDeg, wArcmin),
  };
}
