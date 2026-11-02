import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialAnchor } from '../data/dial-placement';

// The frame's needle geometry, on the 336 dial (quran-app-screens.html, #Qibla). Only this rotates.
const DIAL = 336;

// The tapered gold dart and its quiet counterweight, from the frame.
const DART_PATH = 'M168 64 L172.5 168 L168 177 L163.5 168 Z';
const COUNTERWEIGHT_PATH = 'M168 168 L165.4 204 L168 209 L170.6 204 Z';

/**
 * The needle of the qibla instrument. It turns by the qibla angle (`bearing − heading` while the phone is live, the bearing
 * at rest), read from the shared SharedValue on the UI thread, so the heading never has to pass through React. QiblaCompass
 * computes the angle once and gives the same value to the marker and the arc, so the three cannot drift apart.
 */
export function QiblaNeedle({
  angle,
  testID = 'qibla-compass-needle',
}: {
  /** The qibla angle in degrees clockwise from the top, shared with the marker and the arc (see QiblaCompass). */
  angle: SharedValue<number>;
  testID?: string;
}) {
  const theme = useTheme();

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
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
