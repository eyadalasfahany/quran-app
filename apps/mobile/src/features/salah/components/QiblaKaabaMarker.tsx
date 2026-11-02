import { I18nManager, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialAnchor, dialPlacement } from '../data/dial-placement';

import { KaabaGlyph } from './KaabaGlyph';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial, the marker on the r=130 orbit.
const DIAL = 336;
const CENTER = DIAL / 2; // 168
const MARKER_ORBIT = 130;

/**
 * The Kaaba marker of the qibla instrument: a 64 px gold halo with the glyph on the r=130 orbit, at the top (north) when
 * the angle is 0. The whole marker turns by `angle` about the dial centre on the UI thread, so it sits at the qibla's
 * angle relative to the phone (see QiblaCompass). The glyph turns by −angle, so it stays upright on screen.
 *
 * Decorative: the compass label carries the bearing.
 */
export function QiblaKaabaMarker({
  angle,
  testID = 'qibla-compass-marker',
}: {
  /** The qibla angle shared with the arc and the needle, in degrees clockwise from the top. */
  angle: SharedValue<number>;
  testID?: string;
}) {
  const theme = useTheme();
  const isRTL = I18nManager.isRTL;

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-angle.value}deg` }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[dialAnchor(DIAL, DIAL), markerStyle]}
      testID={testID}
    >
      <View style={dialPlacement(CENTER - 32, CENTER - MARKER_ORBIT - 32, 64, 64, isRTL)}>
        <Animated.View
          style={[{ ...dialAnchor(64, 64), alignItems: 'center', justifyContent: 'center' }, glyphStyle]}
          testID={`${testID}-glyph`}
        >
          <Svg height={64} style={dialAnchor(64, 64)} width={64}>
            <Defs>
              <RadialGradient id="qibla-marker-halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={theme.colors.qiblaGoldHalo} />
                <Stop offset="65%" stopColor={theme.colors.qiblaGoldHalo} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={32} cy={32} r={32} fill="url(#qibla-marker-halo)" />
          </Svg>
          <KaabaGlyph size={42} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
