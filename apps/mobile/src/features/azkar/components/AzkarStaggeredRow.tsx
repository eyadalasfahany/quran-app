import type { ReactNode } from 'react';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { staggerFadeIn } from '@/core/theme';

/**
 * A list row that fades in with a stagger when it mounts (screens/, #AzkarCategory). The entrance runs
 * once, on mount: a row keeps its key, so a later re-render does not fade it again, and the list only mounts its rows
 * once when it opens. Reduce Motion: a plain fade with no delay.
 */
export function AzkarStaggeredRow({
  index,
  children,
  testID = 'azkar-staggered-row',
}: {
  /** The row's position in the list, 0-based. */
  index: number;
  children: ReactNode;
  testID?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View entering={staggerFadeIn(index, reduceMotion)} testID={testID}>
      {children}
    </Animated.View>
  );
}
