import type { SqlExecutor } from '@/core/db/sql-executor';

export type ChapterAudio = {
  id: number;
  url: string;
  durationMs: number;
  sizeBytes: number | null;
  format: string;
};

/** The audio file for one surah from one recitation. `recitationId` is `recitations.id`, not the resource id. */
export function chapterAudio(db: SqlExecutor, recitationId: number, chapterId: number): ChapterAudio | undefined {
  return db.get<ChapterAudio>(
    `SELECT
       id,
       audio_url AS url,
       duration_ms AS durationMs,
       size_bytes AS sizeBytes,
       format
     FROM chapter_audio_files
     WHERE recitation_id = ? AND chapter_id = ?
     ORDER BY id
     LIMIT 1`,
    [recitationId, chapterId],
  );
}
