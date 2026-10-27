import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { BismillahLine } from '@/features/reader/components/BismillahLine';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { MushafLine as MushafLineData } from '@/features/reader/data/mushaf';
import { mushafFontSize, mushafLineHeight } from '@/features/reader/mushaf/page-metrics';
import { buildMushafLineSlots } from '@/features/reader/mushaf/page-slots';
import { SurahCartouche } from '@/shared/ui';

import { MushafLine } from './MushafLine';

export function MushafPage({
  contentWidth,
  fontFamily,
  lines,
  chapterStarts,
  chapterForVerse,
  activeVerseId = null,
  selectedVerseId = null,
  highlightByVerse,
  onVersePress,
  onVerseLongPress,
  testID,
}: {
  contentWidth: number;
  fontFamily: string;
  lines: MushafLineData[];
  chapterStarts: readonly ChapterRecord[];
  chapterForVerse: (verseId: number) => number | undefined;
  activeVerseId?: number | null;
  selectedVerseId?: number | null;
  highlightByVerse?: ReadonlyMap<number, HighlightColor>;
  onVersePress?: (verseId: number) => void;
  onVerseLongPress?: (verseId: number) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const fontSize = mushafFontSize(contentWidth);
  const lineHeight = mushafLineHeight(contentWidth);
  const slots = buildMushafLineSlots(lines, chapterStarts, chapterForVerse);

  return (
    <View
      style={{
        alignSelf: 'center',
        borderColor: theme.colors.gold,
        borderRadius: theme.radius.sm / 2,
        borderWidth: 1,
        padding: 3,
        width: contentWidth,
      }}
      testID={testID}
    >
      <View
        style={{
          borderColor: theme.colors.gold,
          borderRadius: theme.radius.sm / 4,
          borderWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: theme.space[2],
          paddingVertical: theme.space[2],
        }}
      >
        {slots.map((slot) => {
          if (slot.kind === 'words') {
            return (
              <MushafLine
                activeVerseId={activeVerseId}
                fontFamily={fontFamily}
                fontSize={fontSize}
                highlightByVerse={highlightByVerse}
                key={`line-${slot.line}`}
                lineHeight={lineHeight}
                onVerseLongPress={onVerseLongPress}
                onVersePress={onVersePress}
                selectedVerseId={selectedVerseId}
                testID={testID ? `${testID}-line-${slot.line}` : undefined}
                words={slot.words}
              />
            );
          }
          if (slot.kind === 'surah-header') {
            return (
              <SurahCartouche
                key={`header-${slot.line}`}
                name={slot.nameArabic}
                testID={testID ? `${testID}-header-${slot.line}` : undefined}
              />
            );
          }
          if (slot.kind === 'bismillah') {
            const text = bismillahTextForLine(slot.line, chapterStarts, lines, chapterForVerse);
            return (
              <BismillahLine
                key={`bismillah-${slot.line}`}
                testID={testID ? `${testID}-bismillah-${slot.line}` : undefined}
                text={text}
              />
            );
          }
          return <View key={`empty-${slot.line}`} style={{ height: lineHeight }} />;
        })}
      </View>
    </View>
  );
}

function bismillahTextForLine(
  line: number,
  chapterStarts: readonly ChapterRecord[],
  lines: MushafLineData[],
  chapterForVerse: (verseId: number) => number | undefined,
): string {
  for (const chapter of chapterStarts) {
    if (!chapter.bismillahPre) {
      continue;
    }
    let firstLine: number | undefined;
    for (const entry of lines) {
      for (const word of entry.words) {
        if (chapterForVerse(word.verseId) !== chapter.id) {
          continue;
        }
        firstLine = firstLine === undefined ? entry.line : Math.min(firstLine, entry.line);
      }
    }
    if (firstLine !== undefined && firstLine - 1 === line) {
      return chapter.bismillahText ?? '';
    }
  }
  return '';
}
