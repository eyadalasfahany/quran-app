import type { SqlExecutor } from '@/core/db/sql-executor';

export type JuzStart = {
  juz: number;
  verseKey: string;
  /** The surah the juz starts in, for «يبدأ من سورة البقرة، الآية ١٤٢». */
  chapterNameArabic: string;
  chapterNameSimple: string;
  verseNumber: number;
};

export function listJuzStarts(db: SqlExecutor): JuzStart[] {
  return db.all<JuzStart>(
    `SELECT v.juz, v.verse_key AS verseKey, c.name_arabic AS chapterNameArabic, c.name_simple AS chapterNameSimple,
            v.verse_number AS verseNumber
     FROM verses v
     JOIN chapters c ON c.id = v.chapter_id
     WHERE v.id IN (SELECT MIN(id) FROM verses GROUP BY juz)
     ORDER BY v.juz`,
  );
}
