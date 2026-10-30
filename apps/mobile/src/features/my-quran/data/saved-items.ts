import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Bookmark, Highlight, Note } from '@/features/library/data';
import { getChapter, type ChapterRecord } from '@/features/reader/data/chapters';
import { getVerseRange, type VerseRecord } from '@/features/reader/data/verses';

/** A user.db row joined to its verse and chapter in content.db. */
export type SavedItem<T> = { row: T; verse: VerseRecord; chapter: ChapterRecord | undefined };

export type SavedBookmarkItem = SavedItem<Bookmark>;
export type SavedHighlightItem = SavedItem<Highlight>;
export type SavedNoteItem = SavedItem<Note>;

/**
 * Joins user rows to their verses for the My Quran lists. A row whose verse is not in content.db
 * (a pack the device no longer holds) drops out of the list rather than breaking it.
 */
export function resolveSavedVerses<T extends { verseId: number }>(
  db: SqlExecutor,
  rows: readonly T[],
): SavedItem<T>[] {
  const items: SavedItem<T>[] = [];
  for (const row of rows) {
    const verse = getVerseRange(db, row.verseId, row.verseId)[0];
    if (verse === undefined) {
      continue;
    }
    items.push({ row, verse, chapter: getChapter(db, verse.chapterId) });
  }
  return items;
}
