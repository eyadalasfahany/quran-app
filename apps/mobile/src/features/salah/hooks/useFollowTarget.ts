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
 * `sources` are the SharedValues the target is computed from, and `targetFor` is a worklet that receives their current
 * values, in the same order, with the `following` state. While not following it returns the rest value. While following,
 * the value springs by the shortest turn from where it is now, accumulated so it never swings through 0 (359 → 1 is +2,
 * not −358). When not following it snaps to the target with no animation.
 *
 * The sources are passed explicitly and read in the reaction's own prepare worklet. Reanimated only subscribes to shared
 * values it can see in the prepare worklet's closure, and it does not look inside functions captured by that closure, so
 * a SharedValue read only inside `targetFor` would never trigger the reaction.
 */
export function useFollowTarget<Sources extends SharedValue<number>[]>(
  following: boolean,
  initial: number,
  sources: [...Sources],
  targetFor: (following: boolean, values: { [Index in keyof Sources]: number }) => number,
): SharedValue<number> {
  const value = useSharedValue(initial);
  const followValue = useSharedValue(following);

  useEffect(() => {
    followValue.value = following;
  }, [following, followValue]);

  useAnimatedReaction(
    // The values come in the order of `sources`, so the tuple type of `sources` is the type of `values`. A plain loop, not
    // `sources.map(fn)`: the inline callback would be hoisted as a non-worklet function and throw on the UI runtime.
    () => {
      const values: number[] = [];
      for (let index = 0; index < sources.length; index += 1) {
        values.push(sources[index]!.value);
      }
      return targetFor(followValue.value, values as { [Index in keyof Sources]: number });
    },
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
