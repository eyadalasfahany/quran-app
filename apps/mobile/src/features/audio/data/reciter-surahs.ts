import type { SqlExecutor } from '@/core/db/sql-executor';
import { listChapters, type ChapterRecord } from '@/features/reader/data/chapters';

import { recitationIdForResource } from './reciters';
import { chapterIdsWithAudio } from './audio-files';

export type ReciterSurahs = {
  /** The surahs the reciter has an audio file for, in surah order. Empty until the pack is installed. */
  surahs: ChapterRecord[];
  /** Every surah of the Quran, for the «{n} من ١١٤» count. */
  total: number;
};

/** One reciter's surah list for the download page. */
export function reciterSurahs(db: SqlExecutor, resourceId: number): ReciterSurahs {
  const chapters = listChapters(db);
  const recitationId = recitationIdForResource(db, resourceId);
  if (recitationId === undefined) {
    return { surahs: [], total: chapters.length };
  }
  const withAudio = new Set(chapterIdsWithAudio(db, recitationId));
  return { surahs: chapters.filter((chapter) => withAudio.has(chapter.id)), total: chapters.length };
}
