import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { ListRow, UiText } from '@/shared/ui';

export function ContinueReadingRow({
  chapter,
  verseKey,
  ayah,
  onPress,
  testID = 'index-continue-reading',
}: {
  chapter: ChapterRecord;
  verseKey: string;
  ayah: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2], paddingBottom: theme.space[3] }}>
      <UiText variant="headline">{t('library.index.continueReading')}</UiText>
      <ListRow
        onPress={onPress}
        separator="strong"
        subtitle={t('library.index.continueSubtitle', {
          ayah,
          surah: chapter.nameArabic,
          verseKey,
        })}
        testID={testID}
        title={chapter.nameSimple}
      />
    </View>
  );
}
