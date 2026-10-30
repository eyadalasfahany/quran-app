import type { HighlightColor } from '@/features/library/data/model';
import type { MushafWord } from '@/features/reader/data/mushaf';
import { Text, View } from 'react-native';

import { useTheme, type Theme } from '@/core/theme';
import { highlightFill } from '@/shared/ui';

export function MushafLine({
  words,
  fontFamily,
  fontSize,
  lineHeight,
  activeVerseId = null,
  selectedVerseId = null,
  highlightByVerse,
  khatmaMarkerVerseId = null,
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
  /** Gold end-of-ayah glyph (`charType === 'end'`) on the marked verse. */
  khatmaMarkerVerseId?: number | null;
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
        borderStartWidth: activeOnLine ? theme.stroke.activeRule : 0,
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
              khatmaMarkerVerseId,
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
    khatmaMarkerVerseId: number | null;
    selectedVerseId: number | null;
    highlightByVerse?: ReadonlyMap<number, HighlightColor>;
    theme: Theme;
  },
) {
  const color = ctx.theme.colors.ink;
  // QCF layout marks each ayah's closing glyph with charType 'end' (see mushaf.ts / MushafWord).
  if (word.charType === 'end') {
    if (word.verseId === ctx.khatmaMarkerVerseId) {
      return { color: ctx.theme.colors.gold };
    }
    return { color };
  }
  const highlight = highlightFill(ctx.theme.colors, ctx.highlightByVerse?.get(word.verseId));
  if (highlight !== undefined) {
    return { backgroundColor: highlight, color };
  }
  if (word.verseId === ctx.activeVerseId || word.verseId === ctx.selectedVerseId) {
    return { backgroundColor: ctx.theme.colors.highlightActive, color };
  }
  return { color };
}
