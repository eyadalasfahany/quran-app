import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { normalize180 } from '../data/qibla-math';

/** Within this many degrees of the Kaaba marker, a dial label fades so the marker never sits on top of it. */
export const LABEL_CLEARANCE_DEGREES = 24;
/** The faded label's opacity: still there as a reference, but out of the marker's way. */
export const LABEL_FADED_OPACITY = 0.12;

/** The label's opacity for the marker at `angle`, the label at `degrees` (both clockwise from the top). */
export function labelOpacityFor(angle: number, degrees: number): number {
  'worklet';
  const gap = Math.abs(normalize180(angle - degrees));
  if (gap >= LABEL_CLEARANCE_DEGREES) {
    return 1;
  }
  return LABEL_FADED_OPACITY + (1 - LABEL_FADED_OPACITY) * (gap / LABEL_CLEARANCE_DEGREES);
}

/**
 * A cardinal or numeral on the fixed qibla face that fades while the moving Kaaba marker passes over it (ADR 0049): the
 * marker orbits the same ring, so at the top it would cover ش. Opacity only, on the UI thread from the shared angle.
 */
export function QiblaLabelClearance({
  angle,
  degrees,
  style,
  children,
  testID,
}: {
  /** The marker's screen angle (QiblaCompass's followed angle). Absent: the label never fades. */
  angle?: SharedValue<number>;
  /** The label's own position on the face, degrees clockwise from the top. */
  degrees: number;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}) {
  const fade = useAnimatedStyle(() => ({ opacity: angle ? labelOpacityFor(angle.value, degrees) : 1 }));

  return (
    <Animated.View pointerEvents="none" style={[style, fade]} testID={testID}>
      {children}
    </Animated.View>
  );
}
