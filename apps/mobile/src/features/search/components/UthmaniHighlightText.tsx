import { I18nManager, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { WordRecord } from '@/features/reader/data/words';
import { QuranText } from '@/shared/ui';

// Padding inside a matched word's outline, from the Search frame's <mark>.
const MATCH_PADDING = 3;

// A search result's ayah, word by word, with each matched word outlined in brand (ADR 0012).
// Nested Text can't draw a border, so the words flow as a wrapping right-to-left row; Arabic words
// don't join across the space between them, so splitting there leaves every glyph as stored.
export function UthmaniHighlightText({
  words,
  highlightedPositions,
  testID,
}: {
  words: WordRecord[];
  highlightedPositions: readonly number[];
  testID?: string;
}) {
  const theme = useTheme();
  const highlighted = new Set(highlightedPositions);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        columnGap: theme.space[1],
        // The Quran reads right to left in either interface language.
        flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
        flexWrap: 'wrap',
      }}
      testID={testID}
    >
      {words.map((word) => {
        const active = highlighted.has(word.position);
        return (
          <View
            key={`${word.verseId}-${word.position}`}
            style={
              active
                ? {
                    borderColor: theme.colors.brand,
                    borderRadius: theme.radius.sm,
                    borderWidth: theme.stroke.match,
                    paddingHorizontal: MATCH_PADDING,
                  }
                : null
            }
            testID={testID && active ? `${testID}-match-${word.position}` : undefined}
          >
            <QuranText variant="quranResult">{word.textUthmani}</QuranText>
          </View>
        );
      })}
    </View>
  );
}
