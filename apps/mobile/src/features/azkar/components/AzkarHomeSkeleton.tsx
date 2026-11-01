import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock, SkeletonGroup, useContrastColors } from '@/shared/ui';

const SESSION_ROWS = 5;
const TOPIC_TILES = 4;

/** Azkar home while the content database opens (quran-app-screens.html, #AzkarLoading). One pulsing group. */
export function AzkarHomeSkeleton({ testID = 'azkar-home-skeleton' }: { testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <SkeletonGroup testID={testID} style={{ gap: theme.space[5] }}>
      <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
        <SkeletonBlock height={theme.size.touchTarget} radius={theme.size.touchTarget / 2} width={theme.size.touchTarget} />
        <View style={{ flex: 1 }} />
        <SkeletonBlock height={theme.size.touchTarget} radius={theme.size.touchTarget / 2} width={theme.size.touchTarget} />
      </View>
      <SkeletonBlock height={160} radius={theme.radius.hero} tone="onBrand" width="100%" />
      <View style={{ borderColor: colors.line, borderRadius: theme.radius.lg, borderWidth: theme.stroke.hairline, gap: theme.space[4], padding: theme.space[4] }}>
        {Array.from({ length: SESSION_ROWS }, (_, index) => (
          <View key={index} style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <SkeletonBlock height={16} width="60%" />
              <SkeletonBlock height={12} width="30%" />
            </View>
            <SkeletonBlock height={44} width={44} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] }}>
        {Array.from({ length: TOPIC_TILES }, (_, index) => (
          <SkeletonBlock key={index} height={88} radius={theme.radius.card} tone="raised" width="47%" />
        ))}
      </View>
    </SkeletonGroup>
  );
}
