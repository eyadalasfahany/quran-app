import type { AyahTiming } from './data/timings';

/**
 * The index of the ayah to highlight at `ms`, in timings sorted by start (as `timingsFor` returns them).
 * Inside an ayah it is that ayah. In a gap it is the ayah before the gap, so the highlight holds. At or after
 * the last end it is the last ayah. Before the first ayah it is -1 (no highlight), and so it is for no timings.
 */
export function activeTimingIndex(timings: readonly AyahTiming[], ms: number): number {
  let low = 0;
  let high = timings.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const timing = timings[middle];
    if (timing !== undefined && timing.startMs <= ms) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * The word position (1-based, as QF sends it) for `ms` inside `timing`, or null when the ayah has no segments.
 * A segment can start a little before its ayah (Afasy 1:2), so `ms` is clamped to the ayah first: the lookup
 * only sees this ayah's segments, and the first word is found at the ayah's start.
 */
export function activeWordPosition(timing: AyahTiming, ms: number): number | null {
  if (timing.segments === null || timing.segments.length === 0) {
    return null;
  }
  const at = Math.min(Math.max(ms, timing.startMs), timing.endMs);
  let best: [position: number, startMs: number, endMs: number] | null = null;
  for (const segment of timing.segments) {
    if (segment[1] <= at && (best === null || segment[1] >= best[1])) {
      best = segment;
    }
  }
  return best?.[0] ?? null;
}
