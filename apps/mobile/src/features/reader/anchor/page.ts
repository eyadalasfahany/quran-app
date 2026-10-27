import type { SqlExecutor } from '@/core/db/sql-executor';

export function pageForVerse(db: SqlExecutor, verseKey: string): number | undefined {
  return db.get<{ page: number }>('SELECT page FROM verses WHERE verse_key = ?', [verseKey])?.page;
}

export function firstVerseOfPage(db: SqlExecutor, page: number): string | undefined {
  return db.get<{ verseKey: string }>(
    'SELECT verse_key AS verseKey FROM verses WHERE page = ? ORDER BY id LIMIT 1',
    [page],
  )?.verseKey;
}
