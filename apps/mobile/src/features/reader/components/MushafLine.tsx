import type { HighlightColor } from '@/features/library/data/model';
import type { MushafWord } from '@/features/reader/data/mushaf';
import { Text, View } from 'react-native';

import { useTheme, type Theme } from '@/core/theme';

const HIGHLIGHT_TOKEN: Record<HighlightColor, keyof ReturnType<typeof useTheme>['colors']> = {
  gold: 'highlightGold',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  rose: 'highlightRose',
};

export function MushafLine({
  words,
  fontFamily,
  fontSize,
  lineHeight,
  activeVerseId = null,
  selectedVerseId = null,
  highlightByVerse,
  onVersePress,
  onVerseLongPress,
  testID,
}: {
  words: MushafWord[];
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  activeVerseId?: number | null;
  selectedVerseId?: number | null;
  highlightByVerse?: ReadonlyMap<number, HighlightColor>;
  onVersePress?: (verseId: number) => void;
  onVerseLongPress?: (verseId: number) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const activeOnLine = words.some(
    (word) => word.verseId === activeVerseId || word.verseId === selectedVerseId,
  );

  return (
    <View
      style={{
        borderStartColor: activeOnLine ? theme.colors.brand : 'transparent',
        borderStartWidth: activeOnLine ? 3 : 0,
        justifyContent: 'center',
        minHeight: lineHeight,
        paddingStart: activeOnLine ? theme.space[1] : 0,
      }}
      testID={testID}
    >
      <Text
        allowFontScaling={false}
        style={{ color: theme.colors.ink, fontFamily, fontSize, lineHeight, textAlign: 'center' }}
      >
        {words.map((word) => (
          <Text
            key={word.wordId}
            onLongPress={onVerseLongPress ? () => onVerseLongPress(word.verseId) : undefined}
            onPress={onVersePress ? () => onVersePress(word.verseId) : undefined}
            style={wordStyle(word, {
              activeVerseId,
              selectedVerseId,
              highlightByVerse,
              theme,
            })}
            suppressHighlighting
          >
            {word.glyph}
          </Text>
        ))}
      </Text>
    </View>
  );
}

function wordStyle(
  word: MushafWord,
  ctx: {
    activeVerseId: number | null;
    selectedVerseId: number | null;
    highlightByVerse?: ReadonlyMap<number, HighlightColor>;
    theme: Theme;
  },
) {
  const color = ctx.theme.colors.ink;
  if (word.charType === 'end') {
    return { color };
  }
  const highlight = ctx.highlightByVerse?.get(word.verseId);
  if (highlight !== undefined) {
    const token = HIGHLIGHT_TOKEN[highlight];
    return { backgroundColor: ctx.theme.colors[token], color };
  }
  if (word.verseId === ctx.activeVerseId || word.verseId === ctx.selectedVerseId) {
    return { backgroundColor: ctx.theme.colors.highlightActive, color };
  }
  return { color };
}
