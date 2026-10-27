import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { ListRow, displayText, uiTextProps } from '@/shared/ui';

export function SurahRow({
  chapter,
  onPress,
  separator,
  testID,
}: {
  chapter: ChapterRecord;
  onPress: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const place = t(`library.surah.revelation.${chapter.revelationPlace}`);
  const subtitle = t('library.surah.meta', { count: chapter.versesCount, place });

  return (
    <ListRow
      leading={
        <View style={{ alignItems: 'center', minWidth: 44, gap: 2 }}>
          <Text
            {...uiTextProps('caption')}
            style={[theme.text.caption, { color: theme.colors.inkMuted, textAlign: 'center' }]}
          >
            {chapter.id}
          </Text>
          <Text
            accessibilityRole="text"
            style={[displayText('displaySm'), { color: theme.colors.ink, textAlign: 'center', writingDirection: 'rtl' }]}
          >
            {chapter.nameArabic}
          </Text>
        </View>
      }
      onPress={onPress}
      separator={separator}
      subtitle={subtitle}
      testID={testID}
      title={chapter.nameSimple}
    />
  );
}
