import { duration, easing, spring as springToken, type DurationToken } from '@quran/design-tokens';
import {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

const [x1, y1, x2, y2] = easing.easeOut;
export const easeOut = Easing.bezier(x1, y1, x2, y2);

// Opacity, color and stroke drawing only: `withTiming(opacity, timing('fast'))`.
export function timing(speed: DurationToken): WithTimingConfig {
  return { duration: duration[speed], easing: easeOut };
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
