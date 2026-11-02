import type { SharedValue } from 'react-native-reanimated';

import { useFollowTarget } from './useFollowTarget';

/**
 * The screen rotation of the dial face for a given turn, in degrees clockwise. The face turns opposite to the phone, so
 * ش (true north) stays on true north on screen while the phone turns under it.
 */
export function dialRotationFor(turn: number): number {
  'worklet';
  return -turn;
}

/**
 * The counter-rotation that keeps a label upright on screen while the dial turns under it: the same turn, the other way
 * round from the dial.
 */
export function uprightRotationFor(turn: number): number {
  'worklet';
  return turn;
}

/**
 * The turn the dial face has reached: the live heading of the screen's top edge, followed with the needle's spring and
 * shortest-turn maths (useFollowTarget), so 359° → 1° turns through north, not the long way round.
 *
 * While `following` is false (no compass yet, Reduce Motion, unsupported hardware) the turn stays at 0, so the dial is
 * the static north-up instrument (D6). Turning on starts a spring from 0 to the current heading.
 *
 * No React state changes per sample: the turn lives in the SharedValue, and only animated styles read it.
 */
export function useDialTurn(heading: SharedValue<number>, following: boolean): SharedValue<number> {
  return useFollowTarget(following, 0, (follow) => {
    'worklet';
    return follow ? heading.value : 0;
  });
}
