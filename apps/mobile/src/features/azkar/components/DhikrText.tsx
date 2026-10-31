import { View } from 'react-native';

import { displayText, ORNATE_CLOSE, ORNATE_OPEN, QuranText, UiText } from '@/shared/ui';
import { useTheme } from '@/core/theme';

import type { AzkarSegment } from '../data/model';

/** Resolves a `quran` segment to its verse text (`verses.text_uthmani`, joined). Empty when it does not resolve. */
export type QuranSegmentText = (segment: AzkarSegment) => string;

type Block = { kind: 'text'; text: string } | { kind: 'quran'; segment: AzkarSegment };

/** Consecutive text segments form one block; each Quran segment is its own block, in order. */
export function dhikrBlocks(segments: readonly AzkarSegment[]): Block[] {
  const blocks: Block[] = [];
  for (const segment of segments) {
    if (segment.kind === 'quran') {
      blocks.push({ kind: 'quran', segment });
      continue;
    }
    if (segment.textAr === null) {
      continue;
    }
    const last = blocks.at(-1);
    if (last?.kind === 'text') {
      last.text = `${last.text} ${segment.textAr}`;
    } else {
      blocks.push({ kind: 'text', text: segment.textAr });
    }
  }
  return blocks;
}

/**
 * A unit's Arabic segments in order. Text uses the `dhikr` display token; Quran uses the Quran font through
 * `QuranText`, never the dhikr font. Both scale with the reader's text size. Text never truncates.
 */
export function DhikrText({
  segments,
  fontScale = 1,
  resolveQuran,
  testID = 'azkar-dhikr-text',
}: {
  segments: readonly AzkarSegment[];
  fontScale?: number;
  resolveQuran: QuranSegmentText;
  testID?: string;
}) {
  const theme = useTheme();
  const blocks = dhikrBlocks(segments);

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      {blocks.map((block, index) => {
        if (block.kind === 'text') {
          return (
            <UiText key={index} align="center" style={displayText('dhikr', fontScale)} variant="dhikr" weight={400}>
              {block.text}
            </UiText>
          );
        }
        const verses = resolveQuran(block.segment);
        if (verses.length === 0) {
          return null;
        }
        return (
          <QuranText key={index} align="center" fontScale={fontScale} variant="quranReading">
            {`${ORNATE_OPEN}${verses}${ORNATE_CLOSE}`}
          </QuranText>
        );
      })}
    </View>
  );
}
