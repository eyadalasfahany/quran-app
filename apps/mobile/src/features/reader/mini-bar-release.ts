import { DETENT_VELOCITY } from './form-sheet';

// The reader bar's drag release (ADR 0020's velocity). Positive translation and velocity point down.

/** A drag down collapses the bar once it passes this share of the bar's height. */
export const COLLAPSE_DISTANCE_RATIO = 0.5;
/** A drag up expands the capsule once it passes this share of the bar's height. */
export const EXPAND_DISTANCE_RATIO = 0.5;

/** A release that moves the bar down past half its height, or faster than DETENT_VELOCITY, collapses it. */
export function shouldCollapse(translationY: number, velocityY: number, barHeight: number): boolean {
  'worklet';
  return velocityY > DETENT_VELOCITY || translationY > barHeight * COLLAPSE_DISTANCE_RATIO;
}

/** A release that moves the capsule up past half the bar's height, or faster than DETENT_VELOCITY, expands it. */
export function shouldExpand(translationY: number, velocityY: number, barHeight: number): boolean {
  'worklet';
  return velocityY < -DETENT_VELOCITY || -translationY > barHeight * EXPAND_DISTANCE_RATIO;
}
