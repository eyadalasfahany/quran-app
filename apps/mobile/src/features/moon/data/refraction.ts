/**
 * Inverse of the refraction correction SunCalc applies to horizontal altitudes (Meeus, Astronomical Algorithms,
 * §16.4, formula 16.4 — the same implementation as `astroRefraction` in suncalc 2.1.1). Odeh and Yallop use
 * geometric (unrefracted) arc of vision; suncalc returns apparent altitude only.
 */

const RAD = Math.PI / 180;

/** Meeus §16.4 refraction in radians for a geometric altitude `h` in radians (same as suncalc). */
export function refractionRadians(geometricAltitudeRad: number): number {
  let h = geometricAltitudeRad;
  if (h < 0) {
    h = 0;
  }
  return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

/** @deprecated Use {@link refractionRadians}. */
export const meeusRefractionRadians = refractionRadians;

/** Geometric altitude in degrees from suncalc's apparent altitude in degrees. */
export function geometricAltitude(apparentDegrees: number): number {
  let h = apparentDegrees * RAD;
  for (let i = 0; i < 8; i += 1) {
    h = apparentDegrees * RAD - refractionRadians(h);
  }
  return h / RAD;
}

/** Alias for {@link geometricAltitude}. */
export const geometricAltitudeFromApparent = geometricAltitude;
