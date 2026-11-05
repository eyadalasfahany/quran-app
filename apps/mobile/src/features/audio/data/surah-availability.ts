import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

import { chapterIdsWithAudio } from './audio-files';
import { recitationIdForResource } from './reciters';

// Whether a reciter has audio for a surah (ADR 0062). A reciter's surah files reach the device in its recitation
// pack, so availability is read from the pack's chapter_audio_files rows. A pack that is not installed has no rows,
// so the app cannot tell a missing surah from a missing pack: that case is 'unknown', never 'unavailable'.
// Everything here takes a resource id (the store's reciterId), not a recitations.id.

export type SurahAvailability = 'available' | 'unavailable' | 'unknown';

/** The surahs the reciter has a file for, or null when the pack is not installed (or has no rows). */
export function availableChapterIds(db: SqlExecutor, resourceId: number): Set<number> | null {
  const recitationId = recitationIdForResource(db, resourceId);
  if (recitationId === undefined) {
    return null;
  }
  const chapterIds = chapterIdsWithAudio(db, recitationId);
  return chapterIds.length === 0 ? null : new Set(chapterIds);
}

export function surahAvailability(db: SqlExecutor, resourceId: number, chapterId: number): SurahAvailability {
  const chapterIds = availableChapterIds(db, resourceId);
  if (chapterIds === null) {
    return 'unknown';
  }
  return chapterIds.has(chapterId) ? 'available' : 'unavailable';
}

/** One query for many reciters: resourceId -> availability of `chapterId`. Missing resource ids are 'unknown'. */
export function availabilityForReciters(
  db: SqlExecutor,
  resourceIds: readonly number[],
  chapterId: number,
): Record<number, SurahAvailability> {
  const result: Record<number, SurahAvailability> = {};
  for (const resourceId of resourceIds) {
    result[resourceId] = 'unknown';
  }
  if (resourceIds.length === 0) {
    return result;
  }

  const placeholders = resourceIds.map(() => '?').join(', ');
  const params: SqlValue[] = [chapterId, ...resourceIds];
  const rows = db.all<{ resourceId: number; hasRows: number; hasChapter: number }>(
    `SELECT
       recitations.resource_id AS resourceId,
       EXISTS (
         SELECT 1 FROM chapter_audio_files WHERE chapter_audio_files.recitation_id = recitations.id
       ) AS hasRows,
       EXISTS (
         SELECT 1 FROM chapter_audio_files
         WHERE chapter_audio_files.recitation_id = recitations.id AND chapter_audio_files.chapter_id = ?
       ) AS hasChapter
     FROM recitations
     WHERE recitations.resource_id IN (${placeholders})`,
    params,
  );

  for (const row of rows) {
    if (row.hasRows !== 1) {
      continue;
    }
    result[row.resourceId] = row.hasChapter === 1 ? 'available' : 'unavailable';
  }
  return result;
}
