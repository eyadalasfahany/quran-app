import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

// Home's «آخر ما استمعت إليه» reads these rows. Local only: no sync columns, no outbox (spec §6).
export const RECENT_LISTENS_CAP = 20;

export type RecentListen = {
  /** QF's audio file id, stable across content re-syncs. One row per file. */
  audioFileId: number;
  reciterResourceId: number;
  chapterId: number;
  lastPositionMs: number;
  /** Epoch milliseconds of the last write. */
  playedAt: number;
};

export type RecentListensStore = {
  db?: SqlExecutor;
};

const RECENT_LISTEN_SELECT = `
  SELECT
    audio_file_id AS audioFileId,
    reciter_resource_id AS reciterResourceId,
    chapter_id AS chapterId,
    last_position_ms AS lastPositionMs,
    played_at AS playedAt
  FROM recent_listens
`;

function defaultExecutor(): SqlExecutor {
  return openUserDb().executor;
}

/**
 * Writes the listen for its audio file, replacing that file's row, then keeps only the newest
 * RECENT_LISTENS_CAP rows. Both steps run in one transaction.
 */
export function upsertRecentListen(row: RecentListen, store?: RecentListensStore): void {
  const db = store?.db ?? defaultExecutor();

  db.transaction(() => {
    db.run(
      `INSERT INTO recent_listens (audio_file_id, reciter_resource_id, chapter_id, last_position_ms, played_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (audio_file_id) DO UPDATE SET
         reciter_resource_id = excluded.reciter_resource_id,
         chapter_id = excluded.chapter_id,
         last_position_ms = excluded.last_position_ms,
         played_at = excluded.played_at`,
      [row.audioFileId, row.reciterResourceId, row.chapterId, row.lastPositionMs, row.playedAt],
    );
    db.run(
      `DELETE FROM recent_listens
       WHERE audio_file_id NOT IN (
         SELECT audio_file_id FROM recent_listens
         ORDER BY played_at DESC, audio_file_id DESC
         LIMIT ?
       )`,
      [RECENT_LISTENS_CAP],
    );
  });
}

/** The newest listens first. `limit` caps the rows returned; the table itself never holds more than the cap. */
export function listRecentListens(limit: number, store?: RecentListensStore): RecentListen[] {
  const db = store?.db ?? defaultExecutor();

  return db.all<RecentListen>(
    `${RECENT_LISTEN_SELECT} ORDER BY played_at DESC, audio_file_id DESC LIMIT ?`,
    [Math.max(0, Math.floor(limit))],
  );
}
