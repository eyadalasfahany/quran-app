import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { needleAngleFor } from '../data/qibla-math';
import { dialAnchor } from '../data/dial-placement';
import { useFollowTarget } from '../hooks/useFollowTarget';

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
 * The turn is always the shortest one (useFollowTarget), so the needle never swings through 0° on a 350° change.
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

  // The bearing is read on the UI thread too: it is the needle's rest target while not following.
  const bearingValue = useSharedValue(bearing);
  useEffect(() => {
    bearingValue.value = bearing;
  }, [bearing, bearingValue]);

  const needleAngle = useFollowTarget(following, bearing, [bearingValue, heading], (follow, [target, live]) => {
    'worklet';
    return follow ? needleAngleFor(target, live) : target;
  });

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAngle.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[dialAnchor(DIAL, DIAL), needleStyle]} testID={testID}>
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
