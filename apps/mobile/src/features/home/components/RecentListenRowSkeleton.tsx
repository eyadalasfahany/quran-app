import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock } from '@/shared/ui';

const TILE_SIZE = 48;
const NAME_HEIGHT = 12;
const SUBTITLE_HEIGHT = 10;
const SUBTITLE_WIDTH = '40%';
const TEXT_GAP = 8;

// Placeholder for one recent listen on Home (RecentListenRow): the reciter's tile, two text lines and the
// play button's place. Compose it inside a SkeletonGroup.
export function RecentListenRowSkeleton({ nameWidth, testID }: { nameWidth: `${number}%`; testID?: string }) {
  const theme = useTheme();
  const control = theme.size.touchTarget;

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <SkeletonBlock height={TILE_SIZE} radius={theme.radius.md} testID={testID ? `${testID}-tile` : undefined} width={TILE_SIZE} />
      <View style={{ flex: 1, gap: TEXT_GAP, minWidth: 0 }}>
        <SkeletonBlock height={NAME_HEIGHT} testID={testID ? `${testID}-name` : undefined} width={nameWidth} />
        <SkeletonBlock height={SUBTITLE_HEIGHT} testID={testID ? `${testID}-subtitle` : undefined} width={SUBTITLE_WIDTH} />
      </View>
      <SkeletonBlock height={control} testID={testID ? `${testID}-control` : undefined} tone="raised" width={control} />
    </View>
  );
}
