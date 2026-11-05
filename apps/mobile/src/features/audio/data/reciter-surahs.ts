import type { SqlExecutor } from '@/core/db/sql-executor';
import { listChapters, type ChapterRecord } from '@/features/reader/data/chapters';

import { availableChapterIds } from './surah-availability';

export type ReciterSurah = ChapterRecord & {
  /** Whether the reciter has an audio file for this surah (ADR 0062). */
  available: boolean;
};

export type ReciterSurahs = {
  /** Every surah of the Quran in order, each flagged. Empty until the pack is installed. */
  surahs: ReciterSurah[];
  /** Surahs the reciter has audio for (the «{n} من {total}» denominator). */
  total: number;
};

/** One reciter's surah list for the download page: every surah, with the ones the reciter lacks flagged. */
export function reciterSurahs(db: SqlExecutor, resourceId: number): ReciterSurahs {
  const chapters = listChapters(db);
  const available = availableChapterIds(db, resourceId);
  // No pack (or no rows yet): nothing to flag, and the total stays the whole Quran.
  if (available === null) {
    return { surahs: [], total: chapters.length };
  }
  return {
    surahs: chapters.map((chapter) => ({ ...chapter, available: available.has(chapter.id) })),
    total: available.size,
  };
}
