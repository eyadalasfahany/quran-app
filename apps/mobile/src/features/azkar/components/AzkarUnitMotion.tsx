import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { I18nManager, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { spring, timing } from '@/core/theme';

/** How far the dhikr content slides when the reader changes unit, in points. */
export const UNIT_SLIDE_DISTANCE = 32;

/** 1 for a move forward in reading order, -1 for a move back. */
export type UnitDirection = 1 | -1;

/**
 * The horizontal offset a new unit starts from, so it slides into place. A forward move (1) comes from the reading-start
 * side, as a pushed screen does (`pushScreenOptions`): from the right in English, from the left in Arabic. A move back
 * (-1) comes from the other side.
 */
export function unitEnterOffset(direction: UnitDirection, rtl: boolean): number {
  return direction * (rtl ? -1 : 1) * UNIT_SLIDE_DISTANCE;
}

/**
 * Wraps the dhikr content of a unit. When `unitKey` changes (auto-advance, previous or next) the content slides in from
 * the side that `direction` names and fades in. Reduce Motion: a fade only, with no slide. The first mount does not
 * animate.
 *
 * The reset to zero opacity runs in a layout effect, which React runs before the browser paints, so the new unit never
 * paints at full opacity for a frame. (A passive effect runs after paint.)
 */
export function AzkarUnitMotion({
  unitKey,
  direction,
  children,
  style,
  testID = 'azkar-unit-motion',
}: {
  unitKey: string;
  direction: UnitDirection;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const reduceMotion = useReducedMotion();
  const rtl = I18nManager.isRTL;
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shownKey = useRef(unitKey);

  useLayoutEffect(() => {
    if (shownKey.current === unitKey) {
      return;
    }
    shownKey.current = unitKey;
    opacity.value = 0;
    opacity.value = withTiming(1, timing('standard'));
    if (reduceMotion) {
      offset.value = 0;
      return;
    }
    offset.value = unitEnterOffset(direction, rtl);
    offset.value = withSpring(0, spring());
  }, [direction, offset, opacity, reduceMotion, rtl, unitKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: offset.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
}
