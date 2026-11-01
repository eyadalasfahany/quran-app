import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';

import { SIBHA_RING_STROKE } from '../data/ring-layout';

/** Resolved once on the JS thread; never call `spring()` from Reanimated worklets. */
const BEAD_SPRING = spring();

/** Angle on the ring for a progress fraction (0 = top, clockwise). UI-thread safe for Reanimated. */
export function sibhaBeadPosition(size: number, stroke: number, fraction: number, beadSize: number) {
  'worklet';
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const angle = -Math.PI / 2 + 2 * Math.PI * fraction;
  return {
    left: center + radius * Math.cos(angle) - beadSize / 2,
    top: center + radius * Math.sin(angle) - beadSize / 2,
  };
}

/**
 * A tasbih bead on the progress ring. It springs to the new count on each tap and briefly scales up.
 */
export function SibhaRingBead({
  fraction,
  size,
  stroke = SIBHA_RING_STROKE,
  testID = 'sibha-counter-bead',
}: {
  fraction: number;
  size: number;
  stroke?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(fraction);
  const pulse = useSharedValue(1);
  const beadSize = Math.max(12, Math.round(size * 0.046));

  useEffect(() => {
    progress.value = reduceMotion ? fraction : withSpring(fraction, BEAD_SPRING);
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withSequence(withSpring(1.14, BEAD_SPRING), withSpring(1, BEAD_SPRING));
  }, [fraction, progress, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const { left, top } = sibhaBeadPosition(size, stroke, progress.value, beadSize);
    return {
      height: beadSize,
      left,
      position: 'absolute',
      top,
      transform: [{ scale: pulse.value }],
      width: beadSize,
    };
  });

  return (
    <Animated.View
      importantForAccessibility="no"
      pointerEvents="none"
      style={[
        animatedStyle,
        {
          backgroundColor: theme.colors.brand,
          borderColor: theme.colors.surfaceRaised,
          borderRadius: beadSize / 2,
          borderWidth: 2,
        },
      ]}
      testID={testID}
    />
  );
}
