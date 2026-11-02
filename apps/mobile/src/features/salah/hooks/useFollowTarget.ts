import { useEffect } from 'react';
import { useAnimatedReaction, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { spring } from '@/core/theme/motion';

import { normalize180, shortestTurn } from '../data/qibla-math';

/** Resolved once on the JS thread; the reaction below runs on the UI thread and must not call spring() there. */
const FOLLOW_SPRING = spring();

/**
 * Follows a target on the UI thread, shared by the dial turn (useDialTurn) and the needle (QiblaNeedle) so the two cannot
 * drift apart.
 *
 * `targetFor` is a worklet that returns the value to follow for the current `following` state; when not following it
 * returns the rest value. While following, the value springs by the shortest turn from where it is now, accumulated so it
 * never swings through 0 (359 → 1 is +2, not −358). When not following it snaps to the target with no animation.
 */
export function useFollowTarget(
  following: boolean,
  initial: number,
  targetFor: (following: boolean) => number,
): SharedValue<number> {
  const value = useSharedValue(initial);
  const followValue = useSharedValue(following);

  useEffect(() => {
    followValue.value = following;
  }, [following, followValue]);

  useAnimatedReaction(
    () => targetFor(followValue.value),
    (target, previous) => {
      if (previous === target) {
        return;
      }
      if (!followValue.value) {
        value.value = target;
        return;
      }
      const delta = shortestTurn(normalize180(value.value), target);
      value.value = withSpring(value.value + delta, FOLLOW_SPRING);
    },
  );

  return value;
}
