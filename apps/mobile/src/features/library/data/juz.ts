import type { SqlExecutor } from '@/core/db/sql-executor';

export type JuzStart = {
  juz: number;
  verseKey: string;
};

export function listJuzStarts(db: SqlExecutor): JuzStart[] {
  return db.all<{ juz: number; verseKey: string }>(
    `SELECT juz, verse_key AS verseKey
     FROM verses
     WHERE id IN (SELECT MIN(id) FROM verses GROUP BY juz)
     ORDER BY juz`,
  );
}
