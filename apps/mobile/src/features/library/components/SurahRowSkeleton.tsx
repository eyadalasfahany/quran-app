import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { MedallionOutline, SkeletonBlock, useContrastColors } from '@/shared/ui';

// The medallion outline is drawn at 0.35 opacity, as the Surah index frame does.
const MEDALLION_OPACITY = 0.35;
const NAME_HEIGHT = 14;
const META_HEIGHT = 10;
const META_WIDTH = '30%';
const PAGE_WIDTH = 28;
const TEXT_GAP = 8;

// Placeholder for one Surah index row (SurahRow): the gold medallion outline, the name over the meta line and
// the start page's place. Pass medallion={false} for a list with no number (the reciter's surahs).
export function SurahRowSkeleton({
  nameWidth,
  medallion = true,
  testID,
}: {
  nameWidth: `${number}%`;
  medallion?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.size.indexRowGap,
        minHeight: theme.size.indexRowMinHeight,
      }}
      testID={testID}
    >
      {medallion ? <MedallionOutline opacity={MEDALLION_OPACITY} testID={testID ? `${testID}-medallion` : undefined} /> : null}
      <View style={{ flex: 1, gap: TEXT_GAP, minWidth: 0 }}>
        <SkeletonBlock height={NAME_HEIGHT} testID={testID ? `${testID}-name` : undefined} width={nameWidth} />
        <SkeletonBlock height={META_HEIGHT} testID={testID ? `${testID}-meta` : undefined} width={META_WIDTH} />
      </View>
      <SkeletonBlock height={META_HEIGHT} testID={testID ? `${testID}-page` : undefined} width={PAGE_WIDTH} />
    </View>
  );
}
