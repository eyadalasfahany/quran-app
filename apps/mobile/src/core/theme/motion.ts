import { duration, easing, spring as springToken, type DurationToken } from '@quran/design-tokens';
import {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
  ZoomIn,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

const [x1, y1, x2, y2] = easing.easeOut;
export const easeOut = Easing.bezier(x1, y1, x2, y2);
const [ex1, ey1, ex2, ey2] = easing.easeInOut;
export const easeInOut = Easing.bezier(ex1, ey1, ex2, ey2);

/** The delay between staggered list rows, and the most rows that wait (a long list does not wait for its last row). */
export const STAGGER_STEP_MS = 40;
export const STAGGER_MAX_STEPS = 8;

/**
 * A list row's fade-in on its first mount: row `index` waits `index` steps, capped. Reduce Motion: a plain fade, no delay.
 * Used as an Animated view's `entering` prop, so it runs once when the row mounts.
 */
export function staggerFadeIn(index: number, reduceMotion: boolean) {
  const steps = reduceMotion ? 0 : Math.min(Math.max(index, 0), STAGGER_MAX_STEPS);
  return FadeIn.delay(steps * STAGGER_STEP_MS)
    .duration(duration.standard)
    .easing(easeOut);
}

/**
 * A scale-in for a finished state (the completion screen): the content grows in and fades in. Reduce Motion: a plain
 * fade, with no scale.
 */
export function useScaleIn() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return FadeIn.duration(duration.slow).easing(easeOut);
  }
  return ZoomIn.springify(springToken.duration).dampingRatio(springToken.dampingRatio);
}

// Opacity, color and stroke drawing only: `withTiming(opacity, timing('fast'))`.
export function timing(speed: DurationToken): WithTimingConfig {
  return { duration: duration[speed], easing: easeOut };
}

// One loading-skeleton pulse, each way: `withRepeat(withTiming(0.55, pulseTiming()), -1, true)`.
export function pulseTiming(): WithTimingConfig {
  return { duration: duration.pulse, easing: easeInOut };
}

// Position and size: `withSpring(y, spring())`, including the release after a drag.
// Reanimated's default ReduceMotion.System makes it jump when Reduce Motion is on.
export function spring(): WithSpringConfig {
  return { dampingRatio: springToken.dampingRatio, duration: springToken.duration };
}

// Custom overlays that slide up from the bottom edge. Sheets, the full player and the tab bar
// are native components with system motion and never use this.
// With Reduce Motion on, the slide becomes a fade. Glass views never use it either:
// they switch glass style instead of fading.
export function useSlideUp() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return {
      entering: FadeIn.duration(duration.slow).easing(easeOut),
      exiting: FadeOut.duration(duration.slow).easing(easeOut),
    };
  }
  return {
    entering: SlideInDown.springify(springToken.duration).dampingRatio(springToken.dampingRatio),
    exiting: SlideOutDown.springify(springToken.duration).dampingRatio(springToken.dampingRatio),
  };
}
