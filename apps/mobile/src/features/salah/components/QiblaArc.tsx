import { View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialAnchor } from '../data/dial-placement';
import { normalize180 } from '../data/qibla-math';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial, the gold arc on the r=130 orbit.
const DIAL = 336;
const CENTER = DIAL / 2; // 168
const MARKER_ORBIT = 130;
const RING_LENGTH = 2 * Math.PI * MARKER_ORBIT;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The signed sweep of the gold arc from north, in degrees. While following, the angle is the shortest turn (−180…180),
 * so the arc takes the short way round to the marker. At rest the angle is the bearing (0…360) and the arc runs
 * clockwise from north, as the static dial always drew it. The angle is accumulated while following, so it is wrapped
 * here to keep the arc inside one turn.
 */
export function arcSweepFor(angle: number, following: boolean): number {
  'worklet';
  if (following) {
    return normalize180(angle);
  }
  return ((angle % 360) + 360) % 360;
}

/**
 * The gold qibla arc (#Qibla): from north (the top, 0°) to the qibla angle, the signed way. Clockwise when the angle is
 * positive, counter-clockwise when negative. Same stroke as before: goldOnBrandSurface, width 3, round cap.
 *
 * The sweep is read from the shared angle on the UI thread: the dash length and the start rotation are animated props,
 * so the arc follows the phone without a React render. When not following, the angle is the bearing and the arc is the
 * static arc from north to the bearing. Decorative and non-interactive.
 */
export function QiblaArc({
  angle,
  following,
  testID = 'qibla-compass-arc',
}: {
  /** The qibla angle shared with the marker and the needle (see QiblaCompass). */
  angle: SharedValue<number>;
  /** Whether the angle is the live, shortest-turn relative angle (false: it is the bearing at rest). */
  following: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  const animatedProps = useAnimatedProps(() => {
    const sweep = arcSweepFor(angle.value, following);
    const length = (RING_LENGTH * Math.abs(sweep)) / 360;
    return {
      // The dash runs clockwise from the start. A counter-clockwise sweep starts that many degrees before north.
      rotation: -90 + Math.min(sweep, 0),
      strokeDasharray: `${length} ${RING_LENGTH - length}`,
    };
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={dialAnchor(DIAL, DIAL)}
      testID={testID}
    >
      <Svg height={DIAL} width={DIAL}>
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={CENTER}
          cy={CENTER}
          fill="none"
          origin={`${CENTER}, ${CENTER}`}
          r={MARKER_ORBIT}
          stroke={theme.colors.goldOnBrandSurface}
          strokeLinecap="round"
          strokeWidth={3}
        />
      </Svg>
    </View>
  );
}
