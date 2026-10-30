import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock, useContrastColors } from '@/shared/ui';

const TILE_SIZE = 46;
const NAME_HEIGHT = 12;
const TAG_HEIGHT = 10;
const TAG_WIDTH = '34%';
const TEXT_GAP = 8;

// Placeholder for one reciter row in the Listen list (ReciterRow), shaped like it: the tile, a name over a
// tag line, then the play and options controls' places. Compose it inside a SkeletonGroup.
export function ReciterRowSkeleton({ nameWidth, testID }: { nameWidth: `${number}%`; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();
  const control = theme.size.touchTarget;

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 66,
      }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: theme.space[3], minWidth: 0 }}>
        <SkeletonBlock height={TILE_SIZE} radius={theme.radius.md} testID={testID ? `${testID}-tile` : undefined} width={TILE_SIZE} />
        <View style={{ flex: 1, gap: TEXT_GAP, minWidth: 0 }}>
          <SkeletonBlock height={NAME_HEIGHT} testID={testID ? `${testID}-name` : undefined} width={nameWidth} />
          <SkeletonBlock height={TAG_HEIGHT} testID={testID ? `${testID}-tag` : undefined} width={TAG_WIDTH} />
        </View>
      </View>
      <SkeletonBlock height={control} testID={testID ? `${testID}-control` : undefined} tone="raised" width={control} />
      <View style={{ width: control }} testID={testID ? `${testID}-spacer` : undefined} />
    </View>
  );
}
