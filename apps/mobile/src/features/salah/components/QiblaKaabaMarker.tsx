import { I18nManager, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialAnchor, dialPlacement } from '../data/dial-placement';

import { KaabaGlyph } from './KaabaGlyph';

// The instrument's fixed geometry (quran-app-screens.html, #Qibla): a 336 px dial, the marker on the r=130 orbit at the top.
const DIAL = 336;
const CENTER = DIAL / 2; // 168
const MARKER_ORBIT = 130;

/**
 * The Kaaba marker of the qibla instrument: a 64 px gold halo with the glyph on the r=130 orbit, fixed at the top under
 * the lubber mark (ADR 0049). The needle turns to meet it when the phone faces the qibla. The glyph stays upright.
 *
 * Decorative: the compass label carries the bearing.
 */
export function QiblaKaabaMarker({ testID = 'qibla-compass-marker' }: { testID?: string }) {
  const theme = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={dialAnchor(DIAL, DIAL)}
      testID={testID}
    >
      <View style={dialPlacement(CENTER - 32, CENTER - MARKER_ORBIT - 32, 64, 64, isRTL)}>
        <View
          style={{ ...dialAnchor(64, 64), alignItems: 'center', justifyContent: 'center' }}
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
        </View>
      </View>
    </View>
  );
}
