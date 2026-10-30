import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SkeletonBlock } from '@/shared/ui';

const STACK_GAP = 10;
const TITLE_MARGIN = 6;
const TRACK_HEIGHT = 4;
const PILL_WIDTH = 72;
const PILL_HEIGHT = 36;
const ROW_GAP = 12;

// Placeholder for Home's Continue reading card (ContinueReadingCard): the brand card's padding and radius, with
// onBrand bars where the surah, the place and the progress track go. Compose it inside a SkeletonGroup.
export function ContinueReadingSkeleton({ testID }: { testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        gap: STACK_GAP,
        overflow: 'hidden',
        padding: theme.size.cardPadding,
      }}
      testID={testID}
    >
      <SkeletonBlock height={10} testID={testID ? `${testID}-place` : undefined} tone="onBrand" width="28%" />
      <SkeletonBlock height={26} radius={8} style={{ marginVertical: TITLE_MARGIN }} testID={testID ? `${testID}-title` : undefined} tone="onBrand" width="58%" />
      <SkeletonBlock height={10} testID={testID ? `${testID}-meta` : undefined} tone="onBrand" width="46%" />
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: ROW_GAP, marginTop: ROW_GAP }}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={TRACK_HEIGHT} radius={TRACK_HEIGHT / 2} testID={testID ? `${testID}-track` : undefined} tone="onBrand" width="100%" />
        </View>
        <SkeletonBlock height={PILL_HEIGHT} radius={PILL_HEIGHT / 2} testID={testID ? `${testID}-pill` : undefined} tone="onBrand" width={PILL_WIDTH} />
      </View>
    </View>
  );
}
