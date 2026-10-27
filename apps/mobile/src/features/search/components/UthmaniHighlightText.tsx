import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { WordRecord } from '@/features/reader/data/words';
import { QuranText } from '@/shared/ui';

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
    <View accessible={false} importantForAccessibility="no" testID={testID}>
      <QuranText
        accessible={false}
        importantForAccessibility="no"
        testID={testID ? `${testID}-body` : undefined}
        variant="quranReading"
      >
        {words.map((word, index) => {
          const active = highlighted.has(word.position);
          const spacer = index < words.length - 1 ? ' ' : '';
          return (
            <Text
              accessible={false}
              importantForAccessibility="no"
              key={`${word.verseId}-${word.position}`}
              style={
                active
                  ? {
                      backgroundColor: theme.colors.highlightActive,
                      borderColor: theme.colors.brand,
                      borderRadius: theme.radius.sm,
                      borderWidth: theme.stroke.hairline,
                    }
                  : undefined
              }
            >
              {word.textUthmani}
              {spacer}
            </Text>
          );
        })}
      </QuranText>
    </View>
  );
}
