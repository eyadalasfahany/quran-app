import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { spring } from '@/core/theme/motion';

import { needleAngleFor, normalize180, shortestTurn } from '../hooks/useQiblaHeading';

// The frame's needle geometry, on the 336 dial (quran-app-screens.html, #Qibla). Only this rotates.
const DIAL = 336;

// The tapered gold dart and its quiet counterweight, from the frame.
const DART_PATH = 'M168 64 L172.5 168 L168 177 L163.5 168 Z';
const COUNTERWEIGHT_PATH = 'M168 168 L165.4 204 L168 209 L170.6 204 Z';

/**
 * The needle of the qibla instrument. While `following` it springs to `bearing − heading`, reading the heading straight
 * from its SharedValue on the UI thread, so the heading never has to pass through React. When not following (Reduce
 * Motion, no compass yet, unsupported hardware) it rests on the marker with no animation (D6).
 *
 * The turn is always the shortest one (`shortestTurn`), so the needle never swings through 0° on a 350° change.
 */
export function QiblaNeedle({
  bearing,
  heading,
  following,
  testID = 'qibla-compass-needle',
}: {
  /** Degrees from true north, 0…360. */
  bearing: number;
  /** The live true-north heading of the screen's top edge, written by useQiblaHeading. */
  heading: SharedValue<number>;
  /** Whether the needle follows the heading (false: it rests on the marker). */
  following: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const springConfig = spring();

  const needleAngle = useSharedValue(bearing);
  const bearingValue = useSharedValue(bearing);
  const followValue = useSharedValue(following);

  useEffect(() => {
    bearingValue.value = bearing;
    followValue.value = following;
  }, [bearing, following, bearingValue, followValue]);

  // The target only changes when the heading moves across a needle step, the bearing changes, or following toggles;
  // the reaction then runs on the UI thread and springs to it.
  useAnimatedReaction(
    () => (followValue.value ? needleAngleFor(bearingValue.value, heading.value) : bearingValue.value),
    (target, previous) => {
      if (previous === target) {
        return;
      }
      if (!followValue.value) {
        // Static dial: the needle rests on the marker, no animation.
        needleAngle.value = target;
        return;
      }
      const delta = shortestTurn(normalize180(needleAngle.value), target);
      needleAngle.value = withSpring(needleAngle.value + delta, springConfig);
    },
  );

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAngle.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, needleStyle]} testID={testID}>
      <Svg height={DIAL} width={DIAL}>
        <Defs>
          <LinearGradient id="qibla-dart" x1="0" x2="0" y1="1" y2="0">
            <Stop offset="0%" stopColor={theme.colors.qiblaDartFrom} />
            <Stop offset="100%" stopColor={theme.colors.playerAccent} />
          </LinearGradient>
        </Defs>
        <Path d={COUNTERWEIGHT_PATH} fill={theme.colors.qiblaCounterweight} />
        {/* The frame's 6 px gold drop-shadow, drawn as a wide glow stroke under the dart. */}
        <Path d={DART_PATH} fill="none" stroke={theme.colors.qiblaDartGlow} strokeLinejoin="round" strokeWidth={12} />
        <Path d={DART_PATH} fill="url(#qibla-dart)" />
      </Svg>
    </Animated.View>
  );
}
