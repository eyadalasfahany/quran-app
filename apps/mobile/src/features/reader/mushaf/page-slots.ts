import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { MushafLine } from '@/features/reader/data/mushaf';

import { MUSHAF_LINES_PER_PAGE } from './constants';

export type MushafLineSlot =
  | { kind: 'words'; line: number; words: MushafLine['words'] }
  | { kind: 'surah-header'; line: number; nameArabic: string }
  | { kind: 'bismillah'; line: number }
  | { kind: 'empty'; line: number };

export function buildMushafLineSlots(
  lines: MushafLine[],
  chapterStarts: readonly ChapterRecord[],
  chapterForVerse: (verseId: number) => number | undefined,
): MushafLineSlot[] {
  const wordsByLine = new Map<number, MushafLine['words']>();
  for (const entry of lines) {
    wordsByLine.set(entry.line, entry.words);
  }

  const decorations = new Map<number, 'surah-header' | 'bismillah'>();
  const headerNames = new Map<number, string>();
  for (const chapter of chapterStarts) {
    const firstWordLine = firstWordLineForChapter(lines, chapter.id, chapterForVerse);
    if (firstWordLine === undefined) {
      continue;
    }
    const headerLine = firstWordLine - (chapter.bismillahPre ? 2 : 1);
    if (headerLine >= 1 && headerLine <= MUSHAF_LINES_PER_PAGE) {
      decorations.set(headerLine, 'surah-header');
      headerNames.set(headerLine, chapter.nameArabic);
    }
    if (chapter.bismillahPre) {
      const bismillahLine = firstWordLine - 1;
      if (bismillahLine >= 1 && bismillahLine <= MUSHAF_LINES_PER_PAGE) {
        decorations.set(bismillahLine, 'bismillah');
      }
    }
  }

  const slots: MushafLineSlot[] = [];
  for (let line = 1; line <= MUSHAF_LINES_PER_PAGE; line += 1) {
    const words = wordsByLine.get(line);
    if (words !== undefined && words.length > 0) {
      slots.push({ kind: 'words', line, words });
      continue;
    }
    const decoration = decorations.get(line);
    if (decoration === 'surah-header') {
      slots.push({ kind: 'surah-header', line, nameArabic: headerNames.get(line) ?? '' });
      continue;
    }
    if (decoration === 'bismillah') {
      slots.push({ kind: 'bismillah', line });
      continue;
    }
    slots.push({ kind: 'empty', line });
  }
  return slots;
}

function firstWordLineForChapter(
  lines: MushafLine[],
  chapterId: number,
  chapterForVerse: (verseId: number) => number | undefined,
): number | undefined {
  let first: number | undefined;
  for (const entry of lines) {
    for (const word of entry.words) {
      if (chapterForVerse(word.verseId) !== chapterId) {
        continue;
      }
      first = first === undefined ? entry.line : Math.min(first, entry.line);
    }
  }
  return first;
}
