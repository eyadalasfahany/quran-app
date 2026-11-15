import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock, SkeletonGroup } from '@/shared/ui';

const TILES = 8;

/**
 * Duas home while the content database opens (screens/, #DuasLoading): the «أدعيتي» card's place, the «التصنيفات»
 * heading, then eight tile places in two columns. One pulsing group, as Azkar's home skeleton.
 */
export function DuasHomeSkeleton({ testID = 'duas-home-skeleton' }: { testID?: string }) {
  const theme = useTheme();

  return (
    <SkeletonGroup testID={testID} style={{ gap: theme.space[5] }}>
      <SkeletonBlock height={160} radius={theme.radius.hero} tone="onBrand" width="100%" />
      <SkeletonBlock height={20} width="30%" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] }}>
        {Array.from({ length: TILES }, (_, index) => (
          <SkeletonBlock key={index} height={88} radius={theme.radius.card} tone="raised" width="47%" />
        ))}
      </View>
    </SkeletonGroup>
  );
}
