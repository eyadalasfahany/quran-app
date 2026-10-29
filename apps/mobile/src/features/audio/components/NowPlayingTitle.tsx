import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

// The reciter, the surah and, when QF sends one, the recitation style as a pill.
export function NowPlayingTitle({ reciter, surah, style }: { reciter: string; surah: string; style: string | null }) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <UiText accessibilityRole="header" style={{ color: theme.colors.playerInk }} testID="now-playing-reciter" variant="title">
        {reciter}
      </UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
        <UiText style={{ color: theme.colors.playerMuted }} testID="now-playing-surah" variant="subhead">
          {surah}
        </UiText>
        {style === null ? null : (
          <View
            style={{
              borderColor: theme.colors.playerLine,
              // The frame's 10 pt pill corner; no radius token sits at 10 (sm is 8, md is 14).
              borderRadius: 10,
              borderWidth: theme.stroke.hairline,
              paddingHorizontal: theme.space[2],
              paddingVertical: 1,
            }}
            testID="now-playing-style"
          >
            <UiText style={{ color: theme.colors.playerAccent }} variant="label" weight={600}>
              {style}
            </UiText>
          </View>
        )}
      </View>
    </View>
  );
}
