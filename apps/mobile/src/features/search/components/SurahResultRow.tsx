import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { chapterDisplayName, type ChapterRecord } from '@/features/reader/data/chapters';
import { Card, UiText } from '@/shared/ui';

// A surah match in search, from the Search frame: the number on a brand tile, «سورة الرحمن» in Amiri,
// its ayah count and start page, and a gold «سورة» tag.
export function SurahResultRow({
  chapter,
  onPress,
  testID,
}: {
  chapter: ChapterRecord;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const title = t('reader.surahTitle', { name: chapterDisplayName(chapter, locale) });
  const hint = t('search.surahResultHint', {
    count: chapter.versesCount,
    n: formatNumber(chapter.versesCount, locale),
    page: formatNumber(chapter.pageStart, locale),
  });
  const tag = t('search.surahTag');

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: title, title: hint })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <Card padding={3} radius="lg">
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.brandSurface,
              borderRadius: theme.radius.md,
              height: theme.size.touchTarget,
              justifyContent: 'center',
              width: theme.size.touchTarget,
            }}
            testID={testID ? `${testID}-number` : undefined}
          >
            <UiText tone="onBrand" variant="headline">
              {formatNumber(chapter.id, locale)}
            </UiText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <UiText variant="displaySm">{title}</UiText>
            <UiText tone="muted" variant="label">
              {hint}
            </UiText>
          </View>
          <UiText tone="goldInk" variant="label" weight={600}>
            {tag}
          </UiText>
        </View>
      </Card>
    </Pressable>
  );
}
