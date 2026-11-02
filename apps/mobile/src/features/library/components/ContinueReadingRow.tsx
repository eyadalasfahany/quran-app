import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { chapterDisplayName, type ChapterRecord } from '@/features/reader/data/chapters';
import { Card, Icon, UiText } from '@/shared/ui';

const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;

// The Surah index's last-read card (quran-app-screens.html, #SurahIndex): a bookmark, «آخر قراءة: البقرة · الآية ٢٥٥»,
// and «متابعة» on the trailing side.
export function ContinueReadingRow({
  chapter,
  ayah,
  onPress,
  testID = 'index-continue-reading',
}: {
  chapter: ChapterRecord;
  ayah: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const label = t('library.index.lastRead', { ayah: formatNumber(ayah, locale), surah: chapterDisplayName(chapter, locale) });
  const resume = t('library.index.resume');

  return (
    <Pressable
      accessibilityLabel={`${label}, ${resume}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ marginBottom: theme.size.blockGap, opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <Card
        padding={2}
        radius="tile"
        testID={`${testID}-card`}
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.size.lastReadGap,
          paddingHorizontal: theme.size.lastReadPaddingX,
          paddingVertical: theme.size.lastReadPaddingY,
        }}
      >
        <Icon color={theme.colors.brand} name={BOOKMARK} size={theme.size.iconMd} />
        <UiText numberOfLines={1} style={{ flex: 1 }} variant="subhead" weight={500}>
          {label}
        </UiText>
        <UiText tone="brand" variant="caption" weight={600}>
          {resume}
        </UiText>
      </Card>
    </Pressable>
  );
}
