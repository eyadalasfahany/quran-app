import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { MINI_PLAYER_PROGRESS_HEIGHT } from '../mini-player-metrics';

// The gold line along the bar's top edge. The track is a row, so the fill starts at the start edge: the
// right in Arabic, the left in English. Decorative: the play button and the title carry the state.
export function MiniPlayerProgressLine({ fraction }: { fraction: number }) {
  const theme = useTheme();
  const shown = Math.min(1, Math.max(0, fraction));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        end: 0,
        flexDirection: 'row',
        height: MINI_PLAYER_PROGRESS_HEIGHT,
        position: 'absolute',
        start: 0,
        top: 0,
      }}
      testID="mini-player-progress"
    >
      <View
        style={{
          backgroundColor: theme.colors.gold,
          height: MINI_PLAYER_PROGRESS_HEIGHT,
          width: `${Math.round(shown * 100)}%`,
        }}
        testID="mini-player-progress-fill"
      />
    </View>
  );
}
