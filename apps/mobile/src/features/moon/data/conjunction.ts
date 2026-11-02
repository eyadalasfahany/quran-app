import SunCalc from './suncalc';

const MINUTE_MS = 60_000;
const SYNODIC_MS = 29.530588 * 86_400_000;

function phaseDistance(at: Date): number {
  const { phase } = SunCalc.getMoonIllumination(at);
  return phase <= 0.5 ? phase : 1 - phase;
}

const SCAN_STEP_MS = 5 * MINUTE_MS;

/** Phase-distance minimum in [startMs, endMs], refined to one minute (SunCalc phase; ADR 0043 F3). */
function findNewMoonInWindow(startMs: number, endMs: number): Date {
  let bestT = startMs;
  let bestD = phaseDistance(new Date(startMs));
  for (let t = startMs + SCAN_STEP_MS; t <= endMs; t += SCAN_STEP_MS) {
    const d = phaseDistance(new Date(t));
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  let left = Math.max(startMs, bestT - 6 * 60 * MINUTE_MS);
  let right = Math.min(endMs, bestT + 6 * 60 * MINUTE_MS);
  while (right - left > MINUTE_MS) {
    const mid = Math.floor((left + right) / 2);
    const dLeft = phaseDistance(new Date(left));
    const dMid = phaseDistance(new Date(mid));
    const dRight = phaseDistance(new Date(right));
    if (dMid <= dLeft && dMid <= dRight) {
      if (dLeft < dRight) {
        right = mid;
      } else {
        left = mid;
      }
    } else if (dLeft < dRight) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return new Date(Math.floor((left + right) / 2));
}

/** The most recent new moon at or before `at`, one-minute resolution (Meeus phase wrap via SunCalc). */
export function findPreviousConjunction(at: Date): Date {
  return findNewMoonInWindow(at.getTime() - SYNODIC_MS, at.getTime());
}

/** The next new moon strictly after `at`. */
export function findNextConjunction(at: Date): Date {
  return findNewMoonInWindow(at.getTime() + MINUTE_MS, at.getTime() + SYNODIC_MS);
}

export function bracketNewMoon(at: Date): { previous: Date; next: Date } {
  return { previous: findPreviousConjunction(at), next: findNextConjunction(at) };
}

/** New moon nearest `center`, searched ± `halfWindowDays` (M1 fixtures and spike gate). */
export function findConjunctionNear(center: Date, halfWindowDays = 3): Date {
  const half = halfWindowDays * 86_400_000;
  return findNewMoonInWindow(center.getTime() - half, center.getTime() + half);
}
