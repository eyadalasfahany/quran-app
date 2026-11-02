import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';
import type { WordRecord } from '@/features/reader/data/words';
import { Card, UiText } from '@/shared/ui';

import { UthmaniHighlightText } from './UthmaniHighlightText';

// An ayah match in search, from the Search frame: a card with the reference «الفاتحة · ١» above the ayah,
// its matched words outlined.
export function SearchResultRow({
  verse,
  chapter,
  words,
  highlightedPositions,
  onPress,
  testID,
}: {
  verse: VerseRecord;
  chapter: ChapterRecord;
  words: WordRecord[];
  highlightedPositions: readonly number[];
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const ayah = formatNumber(verse.verseNumber, locale);
  const reference = t('search.resultReference', { ayah, surah: locale === 'ar' ? chapter.nameArabic : chapter.nameSimple });
  const line = `${verse.textImlaei ?? ''} ${t('ui.ayahNumber', { number: ayah })}`.trim();
  const accessibilityLabel = t('common.a11yPair', { label: line, title: reference });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <Card padding={3} radius="lg" style={{ gap: theme.space[1] }}>
        <UiText tone="muted" variant="label" weight={600}>
          {reference}
        </UiText>
        <UthmaniHighlightText
          highlightedPositions={highlightedPositions}
          testID={testID ? `${testID}-text` : undefined}
          words={words}
        />
      </Card>
    </Pressable>
  );
}
