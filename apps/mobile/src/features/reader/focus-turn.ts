import {
  ReduceMotion,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  type LayoutAnimation,
  type SharedValue,
} from 'react-native-reanimated';

import { spring, timing } from '@/core/theme';

/** How far an ayah drifts as it leaves and the next one arrives. */
export const FOCUS_TURN_TRAVEL = 56;

export type FocusTurnDirection = 1 | -1;

/**
 * Focus turns one ayah into the next as a cross-fade: the leaving ayah fades and drifts up (next) or
 * down (previous) while the arriving one fades in from the other side. Position springs and opacity
 * eases, as the motion tokens say. With Reduce Motion on, only the cross-fade remains.
 * `direction` is read when the turn runs, so the leaving ayah follows the turn that removed it.
 */
export function focusTurnAnimations(direction: SharedValue<FocusTurnDirection>, reduceMotion: boolean) {
  const fadeIn = { ...timing('slow'), reduceMotion: ReduceMotion.Never };
  const fadeOut = { ...timing('standard'), reduceMotion: ReduceMotion.Never };
  const move = spring();
  const travel = reduceMotion ? 0 : FOCUS_TURN_TRAVEL;

  const entering = (_values: EntryAnimationsValues): LayoutAnimation => {
    'worklet';
    return {
      animations: { opacity: withTiming(1, fadeIn), transform: [{ translateY: withSpring(0, move) }] },
      initialValues: { opacity: 0, transform: [{ translateY: direction.value * travel }] },
    };
  };

  const exiting = (_values: ExitAnimationsValues): LayoutAnimation => {
    'worklet';
    return {
      animations: {
        opacity: withTiming(0, fadeOut),
        transform: [{ translateY: withSpring(-direction.value * travel, move) }],
      },
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    };
  };

  return { entering, exiting };
}
