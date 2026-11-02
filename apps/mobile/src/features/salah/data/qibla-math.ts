/**
 * Pure angle maths for the qibla instrument. It lives apart from useQiblaHeading.ts so the dial and the needle can run
 * these on the UI thread without importing expo-location or expo-sensors.
 */

/** Normalize an angle into −180…180 so the needle always takes the shortest turn. */
export function normalize180(angle: number): number {
  'worklet';
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

/** The signed shortest turn between two headings, in −180…180. */
export function shortestTurn(from: number, to: number): number {
  'worklet';
  return normalize180(to - from);
}

/**
 * The needle's target on the fixed north-referenced dial: `bearing − heading`,
 * normalized so it always takes the shortest turn (no 350° swings through 0°).
 */
export function needleAngleFor(bearing: number, heading: number): number {
  'worklet';
  return normalize180(bearing - heading);
}

/** Normalize an angle into 0…360 (359 and 1 stay one degree apart across north). */
export function normalize360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
