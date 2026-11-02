import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { MINI_PLAYER_INLINE_PROGRESS, MINI_PLAYER_PROGRESS_HEIGHT } from '../mini-player-metrics';

// The gold line. `edge` (the default, on the mini player bars) sits along the bar's top edge. `inline` (the adhan
// sound rows) is a track in the flow: `line` behind, the gold fill on top, radius 2 (`.xw-progress`).
// The track is a row, so the fill starts at the start edge: the right in Arabic, the left in English.
// Decorative: the play button and the title carry the state.
export function MiniPlayerProgressLine({ fraction, placement = 'edge' }: { fraction: number; placement?: 'edge' | 'inline' }) {
  const theme = useTheme();
  const shown = Math.min(1, Math.max(0, fraction));
  const inline = placement === 'inline';
  const height = inline ? MINI_PLAYER_INLINE_PROGRESS.height : MINI_PLAYER_PROGRESS_HEIGHT;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={
        inline
          ? {
              backgroundColor: theme.colors.line,
              borderRadius: MINI_PLAYER_INLINE_PROGRESS.radius,
              flexDirection: 'row',
              height,
              overflow: 'hidden',
            }
          : {
              end: 0,
              flexDirection: 'row',
              height,
              position: 'absolute',
              start: 0,
              top: 0,
            }
      }
      testID="mini-player-progress"
    >
      <View
        style={{
          backgroundColor: theme.colors.gold,
          height,
          width: `${Math.round(shown * 100)}%`,
        }}
        testID="mini-player-progress-fill"
      />
    </View>
  );
}
