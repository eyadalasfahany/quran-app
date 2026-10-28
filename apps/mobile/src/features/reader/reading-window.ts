import type { SqlExecutor } from '@/core/db/sql-executor';

import { getChapter } from './data/chapters';
import { getVerseByKey, getVerseRange, verseKeyToId, type VerseRecord } from './data/verses';
import type { ReadingRow } from './reading-list-types';

export const READING_WINDOW_HALF = 100;
export const READING_WINDOW_EXTEND = 50;
export const LAST_VERSE_ID = 6236;

export function verseWindowBounds(centerId: number, half = READING_WINDOW_HALF): { fromId: number; toId: number } {
  return {
    fromId: Math.max(1, centerId - half),
    toId: Math.min(LAST_VERSE_ID, centerId + half),
  };
}

export function expandWindowEnd(toId: number, extend = READING_WINDOW_EXTEND): number {
  return Math.min(LAST_VERSE_ID, toId + extend);
}

export function expandWindowStart(fromId: number, extend = READING_WINDOW_EXTEND): number {
  return Math.max(1, fromId - extend);
}

export function shouldShowBismillahRow(chapterId: number, verseNumber: number, bismillahPre: number): boolean {
  return verseNumber === 1 && bismillahPre === 1;
}

export function buildReadingRows(db: SqlExecutor, fromId: number, toId: number): ReadingRow[] {
  const verses = getVerseRange(db, fromId, toId);
  if (verses.length === 0) {
    return [];
  }

  const rows: ReadingRow[] = [];

  for (const verse of verses) {
    if (verse.verseNumber === 1) {
      const chapter = getChapter(db, verse.chapterId);
      if (chapter !== undefined) {
        rows.push({ type: 'surah-header', key: `surah-${chapter.id}`, chapter });
        if (shouldShowBismillahRow(chapter.id, verse.verseNumber, chapter.bismillahPre) && chapter.bismillahText !== null) {
          rows.push({ type: 'bismillah', key: `bismillah-${chapter.id}`, text: chapter.bismillahText });
        }
      }
    }

    rows.push({ type: 'ayah', key: verse.verseKey, verse });
  }

  return rows;
}

export function resolveCenterId(db: SqlExecutor, verseKey: string): number {
  return verseKeyToId(db, verseKey) ?? 1;
}

export function firstAyahVerseKeyInRows(rows: readonly ReadingRow[]): string | undefined {
  for (const row of rows) {
    if (row.type === 'ayah') {
      return row.verse.verseKey;
    }
  }
  return undefined;
}

export function verseKeyFromRow(row: ReadingRow): string | undefined {
  return row.type === 'ayah' ? row.verse.verseKey : undefined;
}

export function anchorVerseInSeed(db: SqlExecutor, verseKey: string): VerseRecord | undefined {
  return getVerseByKey(db, verseKey);
}

/**
 * The row the list opens at for a verse. Opening a surah at its first ayah shows its title and
 * bismillah too, so it opens at the surah header; any other ayah opens at its own row.
 */
export function anchorRowIndex(rows: readonly ReadingRow[], verseKey: string): number {
  const [chapter, verse] = verseKey.split(':').map(Number);
  if (verse === 1) {
    const header = rows.findIndex((row) => row.type === 'surah-header' && row.chapter.id === chapter);
    if (header >= 0) {
      return header;
    }
  }
  return rows.findIndex((row) => row.type === 'ayah' && row.verse.verseKey === verseKey);
}
