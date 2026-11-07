import { duration } from '@quran/design-tokens';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { pulseTiming, useTheme } from '@/core/theme';

// The buffering pulse's low opacity under Reduce Motion (screens/, «Loading states»).
const REDUCED_PULSE_OPACITY = 0.55;
// From this outer size the ring uses the frame's 3 pt stroke (the 76 pt full-player button); smaller rings use 2 pt.
const WIDE_RING_MIN_SIZE = 60;

/**
 * The buffering ring (screens/, «Loading states»): a thin track with a quarter arc that turns once per
 * `duration.pulse` around a play button while audio starts. Under Reduce Motion the ring stays still and pulses instead.
 * It is drawn inside the child's bounds, in `color` (the child's glyph colour), and is hidden from screen readers. The
 * busy state belongs on the child's own control. Inactive, it renders the child alone.
 */
export function BufferingRing({
  size,
  active,
  color,
  children,
  testID,
}: {
  /** The outer diameter: the child's size. */
  size: number;
  active: boolean;
  /** The glyph colour the ring is drawn in. */
  color: string;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    if (reduceMotion) {
      pulse.value = withRepeat(withTiming(REDUCED_PULSE_OPACITY, pulseTiming()), -1, true);
    } else {
      rotation.value = withRepeat(
        withTiming(360, { duration: duration.pulse, easing: Easing.linear }),
        -1,
      );
    }
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      rotation.value = 0;
      pulse.value = 1;
    };
  }, [active, reduceMotion, pulse, rotation]);

  const spin = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!active) {
    return <>{children}</>;
  }

  // The stroke sits inside the box, so the ring never spills past the button's edge.
  const strokeWidth = size >= WIDE_RING_MIN_SIZE ? theme.stroke.activeRule : theme.stroke.selectedRing;
  const radius = size / 2 - strokeWidth / 2;
  const centre = size / 2;
  const quarterArc = `M ${centre} ${centre - radius} A ${radius} ${radius} 0 0 1 ${centre + radius} ${centre}`;

  return (
    <View style={{ height: size, width: size }}>
      {children}
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, spin]}
        testID={testID}
      >
        <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <Circle
            cx={centre}
            cy={centre}
            fill="none"
            opacity={theme.opacity.focusAside}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path d={quarterArc} fill="none" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
        </Svg>
      </Animated.View>
    </View>
  );
}
