import type { DimensionValue, ViewStyle } from 'react-native';

export type TimelineOrientation = 'horizontal' | 'vertical';

const pct = (value: number): DimensionValue => `${value * 100}%`;

/**
 * Style helpers for the two axes of the timeline: age 0 sits at the start edge on the horizontal bar (the right in
 * Arabic) and at the top of the vertical one. `main` is the position along the axis as a fraction of its length.
 */
export function alongStart(orientation: TimelineOrientation, fraction: number): ViewStyle {
  return orientation === 'horizontal' ? { start: pct(fraction) } : { top: pct(fraction) };
}

export function alongSize(orientation: TimelineOrientation, fraction: number): ViewStyle {
  return orientation === 'horizontal' ? { width: pct(fraction) } : { height: pct(fraction) };
}

/** The age under a touch: `offset` along the axis of `length`, mirrored on the horizontal axis under RTL. */
export function fractionOfTouch(orientation: TimelineOrientation, offset: number, length: number, rtl: boolean): number {
  'worklet';
  if (length <= 0) {
    return 0;
  }
  const raw = Math.min(1, Math.max(0, offset / length));
  return orientation === 'horizontal' && rtl ? 1 - raw : raw;
}
