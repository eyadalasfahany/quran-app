import { useEffect } from 'react';
import { useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { spring, timing } from '@/core/theme';

/**
 * The offline strip's motion, shared by the strip (OfflineBanner) and the layout that it pushes down (MainShell).
 * `layout` is 0 when the strip is closed and 1 when it is open; the strip's height is `layout * natural`, where
 * `natural` is the strip's own measured height. `fade` is its opacity.
 */
export type OfflineStripMotion = {
  natural: SharedValue<number>;
  layout: SharedValue<number>;
  fade: SharedValue<number>;
};

/**
 * Opens the offline strip when `offline` is true and closes it when false. The height springs open and shut (position
 * and size use spring()) and the opacity fades (timing 'standard'). Under Reduce Motion the height changes at once and
 * only the fade animates, so nothing slides.
 */
export function useOfflineStrip(offline: boolean): OfflineStripMotion {
  const reduceMotion = useReducedMotion();
  const target = offline ? 1 : 0;
  const natural = useSharedValue(0);
  const layout = useSharedValue(target);
  const fade = useSharedValue(target);

  useEffect(() => {
    layout.value = reduceMotion ? target : withSpring(target, spring());
    fade.value = withTiming(target, timing('standard'));
  }, [target, reduceMotion, layout, fade]);

  return { natural, layout, fade };
}
