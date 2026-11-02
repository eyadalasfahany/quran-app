import { I18nManager, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialPlacement } from '../data/dial-placement';

const DIAL = 336;
const CENTER = DIAL / 2;
const TICK_WIDTH = 3;
const TICK_HEIGHT = 12;

/**
 * The lubber mark of the qibla instrument: a short gold tick at the top of the bezel, fixed to the screen. It sits
 * outside the rotating dial, so the dial turns under it and the Kaaba marker reaches it when the phone faces the qibla.
 * Decorative (the compass label carries the bearing).
 */
export function QiblaLubber({ testID = 'qibla-compass-lubber' }: { testID?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={dialPlacement(CENTER - TICK_WIDTH / 2, 0, TICK_WIDTH, TICK_HEIGHT, I18nManager.isRTL)}
      testID={testID}
    >
      <Svg height={TICK_HEIGHT} width={TICK_WIDTH}>
        <Path
          d={`M0 0 L${TICK_WIDTH} 0 L${TICK_WIDTH} ${TICK_HEIGHT} L0 ${TICK_HEIGHT} Z`}
          fill={theme.colors.goldOnBrandSurface}
        />
      </Svg>
    </View>
  );
}
