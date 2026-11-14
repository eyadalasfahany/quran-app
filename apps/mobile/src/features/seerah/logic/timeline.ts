import type { SeerahEvent, SeerahFocus, SeerahMilestone } from '../types';
import { AGE_COUNT, AGE_MAX, AGE_MIN, LIFE_STAGES, clampAge, type StageKey } from './age';

/** Where an age sits along an axis, as a fraction of its length (0 at the start edge): the middle of its tick. */
export function ageToFraction(age: number): number {
  return (age + 0.5) / AGE_COUNT;
}

/** The age under a point at `fraction` of the axis length (0 at the start edge), clamped to 0..63. */
export function fractionToAge(fraction: number): number {
  'worklet';
  return clampAge(Math.floor(Math.min(1, Math.max(0, fraction)) * AGE_COUNT));
}

export type StageBand = { key: StageKey; start: number; size: number };

/** Each stage's band as fractions of the axis (start and size); the four bands tile the axis with no gap. */
export function stageBands(): StageBand[] {
  return LIFE_STAGES.map((stage) => ({
    key: stage.key,
    start: stage.from / AGE_COUNT,
    size: (stage.to - stage.from + 1) / AGE_COUNT,
  }));
}

/** One step with an arrow or a VoiceOver increment/decrement: from «all» the first step lands on the first or last age. */
export function stepFocus(focus: SeerahFocus, direction: 1 | -1): SeerahFocus {
  if (focus === null || focus === 'unspecified') {
    return direction === 1 ? AGE_MIN : AGE_MAX;
  }
  return clampAge(focus + direction);
}

export type MilestoneMark = { key: string; labelAr: string; age: number; eventId: string };

/** Milestones are read from their events (never typed): the age is the event's first age. Order is by age. */
export function milestoneMarks(milestones: readonly SeerahMilestone[], events: readonly SeerahEvent[]): MilestoneMark[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  return milestones
    .flatMap((milestone) => {
      const age = byId.get(milestone.eventId)?.ageFrom;
      return age === null || age === undefined ? [] : [{ key: milestone.key, labelAr: milestone.labelAr, age, eventId: milestone.eventId }];
    })
    .sort((a, b) => a.age - b.age);
}

/** Histogram bar heights as fractions of the tallest year; 0 for a year without events. */
export function histogramHeights(counts: readonly number[]): number[] {
  const max = Math.max(1, ...counts);
  return counts.map((count) => count / max);
}
