import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';
import type { WordRecord } from '@/features/reader/data/words';
import { Divider, Icon, UiText, useContrastColors } from '@/shared/ui';

import { UthmaniHighlightText } from './UthmaniHighlightText';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
// ListRow's minimum row height and chevron size; neither has a token yet.
const ROW_MIN_HEIGHT = 52;
const CHEVRON_SIZE = 16;

// A ListRow whose body is an ayah: ListRow only takes a string title, so the row keeps its own body
// and matches ListRow's padding, pressed fill, chevron and separator.
export function SearchResultRow({
  verse,
  chapter,
  words,
  highlightedPositions,
  onPress,
  separator,
  testID,
}: {
  verse: VerseRecord;
  chapter: ChapterRecord;
  words: WordRecord[];
  highlightedPositions: readonly number[];
  onPress: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const imlaei = verse.textImlaei ?? '';
  const reference = t('search.resultReference', {
    ayah: verse.verseNumber,
    surah: chapter.nameArabic,
    verseKey: verse.verseKey,
  });
  const accessibilityLabel = `${imlaei} ${t('ui.ayahNumber', { number: verse.verseNumber })}, ${reference}`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: ROW_MIN_HEIGHT,
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[3],
        },
        pressed ? { backgroundColor: theme.colors.fillSecondary } : null,
      ]}
      testID={testID}
    >
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <UthmaniHighlightText
          highlightedPositions={highlightedPositions}
          testID={testID ? `${testID}-text` : undefined}
          words={words}
        />
        <UiText tone="muted" variant="caption">
          {reference}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={CHEVRON_SIZE} testID="search-result-chevron" />
      {separator ? (
        <Divider
          strong={separator === 'strong'}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0 }}
          testID={testID ? `${testID}-separator` : undefined}
        />
      ) : null}
    </Pressable>
  );
}
