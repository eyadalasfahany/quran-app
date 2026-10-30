import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import { MINI_PLAYER_CHEVRON } from '../mini-player-metrics';

// The small down chevron at the top centre of the reader bar: a hint that it can be dragged away. It is decorative;
// the drag and the bar's accessibility actions carry the meaning. It never takes touches.
export function MiniPlayerChevron() {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        alignItems: 'center',
        left: 0,
        opacity: MINI_PLAYER_CHEVRON.opacity,
        position: 'absolute',
        right: 0,
        top: MINI_PLAYER_CHEVRON.top,
      }}
      testID="mini-player-chevron"
    >
      <Svg fill="none" height={MINI_PLAYER_CHEVRON.height} viewBox="0 0 16 8" width={MINI_PLAYER_CHEVRON.width}>
        <Path
          d="M2 1.5l6 5 6-5"
          stroke={theme.colors.inkMuted}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
        />
      </Svg>
    </View>
  );
}
