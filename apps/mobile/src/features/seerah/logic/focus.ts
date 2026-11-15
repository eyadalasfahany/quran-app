import type { SeerahEvent, SeerahFocus } from '../types';
import { AGE_COUNT, AGE_MIN } from './age';

export function isUnspecifiedEvent(event: Pick<SeerahEvent, 'ageFrom'>): boolean {
  return event.ageFrom === null;
}

/** An event matches an age when the age lies inside its range; the «غير محدد» bucket matches only `'unspecified'`. */
export function eventMatchesFocus(event: Pick<SeerahEvent, 'ageFrom' | 'ageTo'>, focus: SeerahFocus): boolean {
  if (focus === null) {
    return true;
  }
  if (event.ageFrom === null) {
    return focus === 'unspecified';
  }
  if (focus === 'unspecified') {
    return false;
  }
  return focus >= event.ageFrom && focus <= (event.ageTo ?? event.ageFrom);
}

export function focusEvents(events: readonly SeerahEvent[], focus: SeerahFocus): SeerahEvent[] {
  return events.filter((event) => eventMatchesFocus(event, focus));
}

export type YearIndex = {
  /** `byAge[age]` is the events whose range covers the age, in book order. */
  byAge: SeerahEvent[][];
  /** Every event in book order. */
  all: SeerahEvent[];
  unspecified: SeerahEvent[];
  /** Events per age; the timeline's histogram. */
  counts: number[];
  unspecifiedCount: number;
  total: number;
};

/** One pass over the events: year → events, and the «غير محدد» bucket. An event of ages 3 to 5 is in three years. */
export function buildYearIndex(events: readonly SeerahEvent[]): YearIndex {
  const ordered = [...events].sort((a, b) => a.position - b.position);
  const byAge: SeerahEvent[][] = Array.from({ length: AGE_COUNT }, () => []);
  const unspecified: SeerahEvent[] = [];
  for (const event of ordered) {
    if (event.ageFrom === null) {
      unspecified.push(event);
      continue;
    }
    const to = Math.min(event.ageTo ?? event.ageFrom, AGE_MIN + AGE_COUNT - 1);
    for (let age = Math.max(event.ageFrom, AGE_MIN); age <= to; age += 1) {
      byAge[age]?.push(event);
    }
  }
  return {
    byAge,
    all: ordered,
    unspecified,
    counts: byAge.map((list) => list.length),
    unspecifiedCount: unspecified.length,
    total: ordered.length,
  };
}

export function eventsOfFocus(index: YearIndex, focus: SeerahFocus): SeerahEvent[] {
  if (focus === null) {
    return index.all;
  }
  return focus === 'unspecified' ? index.unspecified : (index.byAge[focus] ?? []);
}

/** The age with events nearest to `age` (the lower one on a tie), for the «أقرب عمر» action on an empty year. */
export function nearestAgeWithEvents(index: YearIndex, age: number): number | null {
  let best: number | null = null;
  for (let distance = 0; distance < AGE_COUNT; distance += 1) {
    const lower = age - distance;
    const upper = age + distance;
    if ((index.counts[lower] ?? 0) > 0) {
      best = lower;
      break;
    }
    if ((index.counts[upper] ?? 0) > 0) {
      best = upper;
      break;
    }
  }
  return best;
}
