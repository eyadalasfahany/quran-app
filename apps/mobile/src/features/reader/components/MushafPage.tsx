import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { BismillahLine } from '@/features/reader/components/BismillahLine';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { MushafLine as MushafLineData } from '@/features/reader/data/mushaf';
import { mushafFontSize, mushafLineHeight } from '@/features/reader/mushaf/page-metrics';
import { buildMushafLineSlots } from '@/features/reader/mushaf/page-slots';
import { GoldFrame, SurahCartouche } from '@/shared/ui';

import { MushafLine } from './MushafLine';

export function MushafPage({
  contentWidth,
  fontFamily,
  lines,
  chapterStarts,
  chapterForVerse,
  activeVerseId = null,
  highlightByVerse,
  khatmaMarkerVerseId = null,
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
  highlightByVerse?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  onVersePress?: (verseId: number) => void;
  onVerseLongPress?: (verseId: number) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const fontSize = mushafFontSize(contentWidth);
  const lineHeight = mushafLineHeight(contentWidth);
  const slots = buildMushafLineSlots(lines, chapterStarts, chapterForVerse);

  return (
    <GoldFrame
      contentStyle={{ padding: theme.space[2] }}
      style={{ alignSelf: 'center', width: contentWidth }}
      testID={testID}
      variant="page"
    >
      {slots.map((slot) => {
        if (slot.kind === 'words') {
          return (
            <MushafLine
              activeVerseId={activeVerseId}
              fontFamily={fontFamily}
              fontSize={fontSize}
              highlightByVerse={highlightByVerse}
              khatmaMarkerVerseId={khatmaMarkerVerseId}
              key={`line-${slot.line}`}
              lineHeight={lineHeight}
              onVerseLongPress={onVerseLongPress}
              onVersePress={onVersePress}
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
              variant="compact"
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
    </GoldFrame>
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
