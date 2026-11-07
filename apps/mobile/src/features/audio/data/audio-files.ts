import type { SqlExecutor } from '@/core/db/sql-executor';

export type ChapterAudio = {
  id: number;
  url: string;
  durationMs: number;
  sizeBytes: number | null;
  format: string;
  /** The recorded ayah range of a partial surah (ADR 0077 amendment). Both null for a whole surah. */
  firstAyah: number | null;
  lastAyah: number | null;
};

/** The audio file for one surah from one recitation. `recitationId` is `recitations.id`, not the resource id. */
export function chapterAudio(db: SqlExecutor, recitationId: number, chapterId: number): ChapterAudio | undefined {
  return db.get<ChapterAudio>(
    `SELECT
       id,
       audio_url AS url,
       duration_ms AS durationMs,
       size_bytes AS sizeBytes,
       format,
       first_ayah AS firstAyah,
       last_ayah AS lastAyah
     FROM chapter_audio_files
     WHERE recitation_id = ? AND chapter_id = ?
     ORDER BY id
     LIMIT 1`,
    [recitationId, chapterId],
  );
}

/** The surahs one recitation has an audio file for, in surah order. `recitationId` is `recitations.id`. */
export function chapterIdsWithAudio(db: SqlExecutor, recitationId: number): number[] {
  return db
    .all<{ chapterId: number }>(
      'SELECT DISTINCT chapter_id AS chapterId FROM chapter_audio_files WHERE recitation_id = ? ORDER BY chapter_id',
      [recitationId],
    )
    .map((row) => row.chapterId);
}
