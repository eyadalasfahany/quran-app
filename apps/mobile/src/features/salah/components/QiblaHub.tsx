import { memo } from 'react';
import { I18nManager, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { dialPlacement } from '../data/dial-placement';

const CENTER = 168;
const HUB = 62;

/**
 * The hub of the qibla instrument: the user's position dot. A 5 px player-bg ring, then the gold glow, then the 52 px
 * gradient disc with its faint ring and white dot. It sits above the needle, so it is drawn after it, and it never
 * moves, so it is memoised.
 */
function QiblaHubFace() {
  const theme = useTheme();
  // Placed with a translate, not `left`: `left` is swapped in RTL and would move the hub off the dial's centre.
  const placement = dialPlacement(CENTER - HUB / 2, CENTER - HUB / 2, HUB, HUB, I18nManager.isRTL);

  return (
    <View
      pointerEvents="none"
      style={{
        ...placement,
        alignItems: 'center',
        borderColor: theme.colors.playerBg,
        borderRadius: 31,
        borderWidth: 5,
        boxShadow: `0 0 18px ${theme.colors.qiblaGoldHalo}`,
        justifyContent: 'center',
      }}
      testID="qibla-compass-hub"
    >
      <View
        style={{
          borderColor: theme.colors.goldOnBrandSurface,
          borderRadius: 26,
          borderWidth: 1.5,
          height: 52,
          overflow: 'hidden',
          width: 52,
        }}
      >
        <Svg height={52} width={52}>
          <Defs>
            <RadialGradient id="qibla-hub" cx="50%" cy="32%" r="78%">
              <Stop offset="0%" stopColor={theme.colors.qiblaHubFrom} />
              <Stop offset="100%" stopColor={theme.colors.qiblaHubTo} />
            </RadialGradient>
          </Defs>
          <Circle cx={26} cy={26} r={26} fill="url(#qibla-hub)" />
          <Circle cx={26} cy={26} fill="none" r={11} stroke={theme.colors.qiblaHubRing} strokeWidth={1.5} />
          <Circle cx={26} cy={26} fill={theme.colors.playerInk} r={6} />
        </Svg>
      </View>
    </View>
  );
}

export const QiblaHub = memo(QiblaHubFace);
