import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock, SkeletonGroup, useContrastColors } from '@/shared/ui';

// Frame HadithCollLoading: a hairline card of rows, each a cover-sized block and two text bars.
const DEFAULT_ROWS = 6;
const COVER = { width: 56, height: 75 } as const;
const ROW_PADDING_Y = 12;
const ROW_PADDING_X = 14;

/** The loading state of a list. Its bars pulse through SkeletonGroup, which holds them still with Reduce Motion. */
export function HadithListSkeleton({ rows = DEFAULT_ROWS, testID = 'hadith-list-skeleton' }: { rows?: number; testID?: string }) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <SkeletonGroup testID={testID}>
      <View
        style={{
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: rows }, (_, index) => (
          <View
            key={index}
            style={{
              alignItems: 'center',
              borderBottomColor: colors.line,
              borderBottomWidth: index < rows - 1 ? theme.stroke.hairline : 0,
              flexDirection: 'row',
              gap: theme.space[3],
              paddingHorizontal: ROW_PADDING_X,
              paddingVertical: ROW_PADDING_Y,
            }}
            testID={`${testID}-row-${index}`}
          >
            <SkeletonBlock
              height={COVER.height}
              radius={theme.radius.md}
              testID={`${testID}-cover-${index}`}
              width={COVER.width}
            />
            <View style={{ flex: 1, gap: 10 }}>
              <SkeletonBlock height={14} testID={`${testID}-title-${index}`} width="60%" />
              <SkeletonBlock height={12} testID={`${testID}-count-${index}`} width="38%" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}
