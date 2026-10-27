import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SurahCartouche } from '@/shared/ui';
import { uiTextProps } from '@/shared/ui/textStyles';

import type { ChapterRecord } from '../data/chapters';

export function SurahHeader({ chapter, testID }: { chapter: ChapterRecord; testID?: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const placeKey = chapter.revelationPlace === 'makkah' ? 'reader.revelation.makkah' : 'reader.revelation.madinah';

  return (
    <View
      accessibilityRole="header"
      style={{
        gap: theme.space[2],
        paddingBottom: theme.space[3],
        paddingTop: theme.space[4],
      }}
      testID={testID}
    >
      <SurahCartouche name={chapter.nameArabic} testID={testID ? `${testID}-cartouche` : undefined} />
      <Text
        {...uiTextProps('caption')}
        style={[theme.text.caption, { color: theme.colors.inkMuted, textAlign: 'center' }]}
      >
        {t('reader.surahMeta', {
          place: t(placeKey),
          count: formatNumber(chapter.versesCount, locale),
        })}
      </Text>
    </View>
  );
}
