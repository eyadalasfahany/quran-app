import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';
import type { WordRecord } from '@/features/reader/data/words';
import { Icon, uiTextProps, useContrastColors } from '@/shared/ui';

import { UthmaniHighlightText } from './UthmaniHighlightText';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

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
  const separatorStyle = separator
    ? { borderBottomColor: separator === 'strong' ? colors.lineStrong : colors.line, borderBottomWidth: 1 }
    : null;

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
          minHeight: 52,
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[3],
        },
        separatorStyle,
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
        <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]}>
          {reference}
        </Text>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} testID="search-result-chevron" />
    </Pressable>
  );
}
