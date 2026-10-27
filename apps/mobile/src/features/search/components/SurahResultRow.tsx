import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { ListRow, displayText, uiTextProps } from '@/shared/ui';

export function SurahResultRow({
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

  return (
    <ListRow
      leading={
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 }}>
          <Text
            {...uiTextProps('headline')}
            style={[theme.text.headline, { color: theme.colors.brand, textAlign: 'center' }]}
          >
            {chapter.id}
          </Text>
        </View>
      }
      onPress={onPress}
      separator={separator}
      subtitle={t('search.surahResultHint', { count: chapter.versesCount })}
      testID={testID}
      title={chapter.nameSimple}
      trailing={
        <Text
          style={[displayText('displaySm'), { color: theme.colors.ink, textAlign: 'center', writingDirection: 'rtl' }]}
        >
          {chapter.nameArabic}
        </Text>
      }
    />
  );
}
