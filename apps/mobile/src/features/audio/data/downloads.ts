import { asc, count, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openUserDb } from '@/core/db/user/open';
import { downloads, type downloadStatuses } from '@/core/db/user/schema';
import type { SqlExecutor } from '@/core/db/sql-executor';

// Downloaded recitation audio (step 7, spec §6). Local only: no sync columns and no outbox.

export type DownloadStatus = (typeof downloadStatuses)[number];

export type DownloadRow = {
  /** QF's audio file id (`chapter_audio_files.id`), the primary key. */
  audioFileId: number;
  reciterResourceId: number;
  chapterId: number;
  /** The QF URL the file was downloaded from. Verification compares it with the content row. */
  audioUrl: string;
  /** The content row's `size_bytes` at download time, in the content row's own units. Null when unknown. */
  sourceSizeBytes: number | null;
  /** The file's path relative to the document directory (`audio/{reciter}/{chapter}.{format}`), so it survives a moved container. */
  localPath: string;
  /** Bytes on disk: Content-Length when the response gave one, else the final file size. */
  sizeBytes: number | null;
  status: DownloadStatus;
  /** 0 to 1. */
  progress: number;
  /** The JSON from `DownloadTask.savable()`, kept while paused so the transfer can continue. */
  resumeData: string | null;
  downloadedAt: number | null;
  verifiedAt: number | null;
};

export type DownloadsStore = {
  db?: SqlExecutor;
};

/** A downloaded file is playable offline only while its verification is at most this old (the licence rule). */
export const OFFLINE_VERIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const DOWNLOAD_SELECT = `
  SELECT
    audio_file_id AS audioFileId,
    reciter_resource_id AS reciterResourceId,
    chapter_id AS chapterId,
    audio_url AS audioUrl,
    source_size_bytes AS sourceSizeBytes,
    local_path AS localPath,
    size_bytes AS sizeBytes,
    status,
    progress,
    resume_data AS resumeData,
    downloaded_at AS downloadedAt,
    verified_at AS verifiedAt
  FROM downloads
`;

/** The fields `patchDownload` may change, mapped to their columns. Nothing else reaches the SQL. */
const PATCHABLE_COLUMNS = {
  audioUrl: 'audio_url',
  sourceSizeBytes: 'source_size_bytes',
  localPath: 'local_path',
  sizeBytes: 'size_bytes',
  status: 'status',
  progress: 'progress',
  resumeData: 'resume_data',
  downloadedAt: 'downloaded_at',
  verifiedAt: 'verified_at',
} as const;

export type DownloadPatch = Partial<Pick<DownloadRow, keyof typeof PATCHABLE_COLUMNS>>;

function defaultExecutor(): SqlExecutor {
  return openUserDb().executor;
}

function executorFor(store?: DownloadsStore): SqlExecutor {
  return store?.db ?? defaultExecutor();
}

/** Writes the row for its audio file, replacing any row already there. */
export function upsertDownload(row: DownloadRow, store?: DownloadsStore): void {
  executorFor(store).run(
    `INSERT INTO downloads (
       audio_file_id, reciter_resource_id, chapter_id, audio_url, source_size_bytes, local_path,
       size_bytes, status, progress, resume_data, downloaded_at, verified_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (audio_file_id) DO UPDATE SET
       reciter_resource_id = excluded.reciter_resource_id,
       chapter_id = excluded.chapter_id,
       audio_url = excluded.audio_url,
       source_size_bytes = excluded.source_size_bytes,
       local_path = excluded.local_path,
       size_bytes = excluded.size_bytes,
       status = excluded.status,
       progress = excluded.progress,
       resume_data = excluded.resume_data,
       downloaded_at = excluded.downloaded_at,
       verified_at = excluded.verified_at`,
    [
      row.audioFileId,
      row.reciterResourceId,
      row.chapterId,
      row.audioUrl,
      row.sourceSizeBytes,
      row.localPath,
      row.sizeBytes,
      row.status,
      row.progress,
      row.resumeData,
      row.downloadedAt,
      row.verifiedAt,
    ],
  );
}

/** Changes only the given fields of one row. Does nothing when the row does not exist. */
export function patchDownload(audioFileId: number, patch: DownloadPatch, store?: DownloadsStore): void {
  const entries = (Object.keys(patch) as (keyof DownloadPatch)[]).filter((key) => patch[key] !== undefined);
  if (entries.length === 0) {
    return;
  }
  const assignments = entries.map((key) => `${PATCHABLE_COLUMNS[key]} = ?`).join(', ');
  const values = entries.map((key) => patch[key] ?? null);
  executorFor(store).run(`UPDATE downloads SET ${assignments} WHERE audio_file_id = ?`, [...values, audioFileId]);
}

export function getDownload(audioFileId: number, store?: DownloadsStore): DownloadRow | undefined {
  return executorFor(store).get<DownloadRow>(`${DOWNLOAD_SELECT} WHERE audio_file_id = ?`, [audioFileId]);
}

/** Every row, in audio file id order. */
export function listDownloads(store?: DownloadsStore): DownloadRow[] {
  return executorFor(store).all<DownloadRow>(`${DOWNLOAD_SELECT} ORDER BY audio_file_id`);
}

/** One reciter's rows, in surah order. */
export function listDownloadsForReciter(reciterResourceId: number, store?: DownloadsStore): DownloadRow[] {
  return executorFor(store).all<DownloadRow>(
    `${DOWNLOAD_SELECT} WHERE reciter_resource_id = ? ORDER BY chapter_id, audio_file_id`,
    [reciterResourceId],
  );
}

export function listDownloadsByStatus(statuses: readonly DownloadStatus[], store?: DownloadsStore): DownloadRow[] {
  if (statuses.length === 0) {
    return [];
  }
  const marks = statuses.map(() => '?').join(', ');
  return executorFor(store).all<DownloadRow>(`${DOWNLOAD_SELECT} WHERE status IN (${marks}) ORDER BY audio_file_id`, [
    ...statuses,
  ]);
}

/** The number of surahs of one reciter that are fully downloaded. */
export function countDoneForReciter(reciterResourceId: number, store?: DownloadsStore): number {
  return (
    executorFor(store).get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM downloads WHERE reciter_resource_id = ? AND status = 'done'`,
      [reciterResourceId],
    )?.count ?? 0
  );
}

/** Moves every row in `from` to `to`. Used for the Wi-Fi wait states. */
export function moveDownloadsToStatus(
  from: readonly DownloadStatus[],
  to: DownloadStatus,
  store?: DownloadsStore,
): void {
  if (from.length === 0) {
    return;
  }
  const marks = from.map(() => '?').join(', ');
  executorFor(store).run(`UPDATE downloads SET status = ? WHERE status IN (${marks})`, [to, ...from]);
}

export function deleteDownload(audioFileId: number, store?: DownloadsStore): void {
  executorFor(store).run('DELETE FROM downloads WHERE audio_file_id = ?', [audioFileId]);
}

/** Playable offline when the file is done and was verified within the last 7 days (inclusive). */
export function isPlayableOffline(row: Pick<DownloadRow, 'status' | 'verifiedAt'>, now: number = Date.now()): boolean {
  return row.status === 'done' && row.verifiedAt !== null && now - row.verifiedAt <= OFFLINE_VERIFY_WINDOW_MS;
}

/**
 * A finished download that the device cannot play offline until it connects: it was last verified more than 7 days
 * ago (or never). The file is kept; it plays again once a verification runs.
 */
export function needsVerification(row: Pick<DownloadRow, 'status' | 'verifiedAt'>, now: number = Date.now()): boolean {
  return row.status === 'done' && !isPlayableOffline(row, now);
}

/** Finished downloads that need verifying, counted per reciter. A reciter with none is absent. */
export function verifyNeededCounts(
  rows: readonly Pick<DownloadRow, 'reciterResourceId' | 'status' | 'verifiedAt'>[],
  now: number = Date.now(),
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const row of rows) {
    if (needsVerification(row, now)) {
      counts[row.reciterResourceId] = (counts[row.reciterResourceId] ?? 0) + 1;
    }
  }
  return counts;
}

/** Finished downloads that need verifying, per reciter, live. */
export function useVerifyNeededCounts(): Record<number, number> {
  const { db } = openUserDb();
  const { data } = useLiveQuery(
    db
      .select({
        reciterResourceId: downloads.reciterResourceId,
        status: downloads.status,
        verifiedAt: downloads.verifiedAt,
      })
      .from(downloads)
      .where(eq(downloads.status, 'done')),
  );
  return useMemo(() => verifyNeededCounts(data ?? []), [data]);
}

/** One reciter's download rows, re-read whenever the downloads table changes. */
export function useReciterDownloads(reciterResourceId: number) {
  const { db } = openUserDb();
  return useLiveQuery(
    db
      .select({
        audioFileId: downloads.audioFileId,
        reciterResourceId: downloads.reciterResourceId,
        chapterId: downloads.chapterId,
        status: downloads.status,
        progress: downloads.progress,
        sizeBytes: downloads.sizeBytes,
        downloadedAt: downloads.downloadedAt,
        verifiedAt: downloads.verifiedAt,
      })
      .from(downloads)
      .where(eq(downloads.reciterResourceId, reciterResourceId))
      .orderBy(asc(downloads.chapterId), asc(downloads.audioFileId)),
    [reciterResourceId],
  );
}

/** Fully downloaded surahs per reciter, live. A reciter with none is absent from the map. */
export function useDoneCountsByReciter(): Record<number, number> {
  const { db } = openUserDb();
  const { data } = useLiveQuery(
    db
      .select({ reciterResourceId: downloads.reciterResourceId, count: count() })
      .from(downloads)
      .where(eq(downloads.status, 'done'))
      .groupBy(downloads.reciterResourceId),
  );
  return useMemo(() => {
    const counts: Record<number, number> = {};
    for (const row of data ?? []) {
      counts[row.reciterResourceId] = row.count;
    }
    return counts;
  }, [data]);
}
