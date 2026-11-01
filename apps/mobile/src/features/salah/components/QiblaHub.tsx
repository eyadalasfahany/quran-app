import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/core/theme';

const CENTER = 168;

/**
 * The hub of the qibla instrument: the user's position dot. A 5 px player-bg ring, then the gold glow, then the 52 px
 * gradient disc with its faint ring and white dot. It sits above the needle, so it is drawn after it, and it never
 * moves, so it is memoised.
 */
function QiblaHubFace() {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={{
        alignItems: 'center',
        borderColor: theme.colors.playerBg,
        borderRadius: 31,
        borderWidth: 5,
        boxShadow: `0 0 18px ${theme.colors.qiblaGoldHalo}`,
        height: 62,
        justifyContent: 'center',
        left: CENTER - 31,
        position: 'absolute',
        top: CENTER - 31,
        width: 62,
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
