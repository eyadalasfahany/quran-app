import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { ListRow, UiText } from '@/shared/ui';

// 'index' stacks the number over the Arabic name; 'result' (search) leads with the number in brand and
// ends with the Arabic name.
export type SurahRowVariant = 'index' | 'result';

export function SurahRow({
  chapter,
  onPress,
  variant = 'index',
  subtitle,
  separator,
  testID,
}: {
  chapter: ChapterRecord;
  onPress: () => void;
  variant?: SurahRowVariant;
  // Replaces the verse count and revelation place, as search does with its own hint.
  subtitle?: string;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const place = t(`library.surah.revelation.${chapter.revelationPlace}`);
  const meta = subtitle ?? t('library.surah.meta', { count: chapter.versesCount, place });

  const arabicName = (
    <UiText accessibilityRole="text" align="center" style={{ writingDirection: 'rtl' }} variant="displaySm">
      {chapter.nameArabic}
    </UiText>
  );

  const leading =
    variant === 'index' ? (
      <View style={{ alignItems: 'center', gap: 2, minWidth: theme.size.touchTarget }}>
        <UiText align="center" tone="muted" variant="caption">
          {chapter.id}
        </UiText>
        {arabicName}
      </View>
    ) : (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: theme.size.touchTarget,
          minWidth: theme.size.touchTarget,
        }}
      >
        <UiText align="center" tone="brand" variant="headline">
          {chapter.id}
        </UiText>
      </View>
    );

  return (
    <ListRow
      leading={leading}
      onPress={onPress}
      separator={separator}
      subtitle={meta}
      testID={testID}
      title={chapter.nameSimple}
      trailing={variant === 'result' ? arabicName : undefined}
    />
  );
}
