import type { SqlExecutor } from '@/core/db/sql-executor';

import { openUserTestStore } from '../../../../jest/user-test-db';
import {
  needsVerification,
  verifyNeededCounts,
  countDoneForReciter,
  deleteDownload,
  getDownload,
  isPlayableOffline,
  listDownloads,
  listDownloadsByStatus,
  listDownloadsForReciter,
  moveDownloadsToStatus,
  OFFLINE_VERIFY_WINDOW_MS,
  patchDownload,
  upsertDownload,
  type DownloadRow,
} from './downloads';

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  const opened = openUserTestStore();
  executor = opened.store.db as SqlExecutor;
  close = () => opened.database.close();
});

afterEach(() => {
  close();
});

function row(audioFileId: number, overrides: Partial<DownloadRow> = {}): DownloadRow {
  return {
    audioFileId,
    reciterResourceId: 30,
    chapterId: audioFileId,
    audioUrl: `https://example.test/${audioFileId}.mp3`,
    sourceSizeBytes: 839_808,
    localPath: `audio/30/${audioFileId}.mp3`,
    sizeBytes: null,
    status: 'queued',
    progress: 0,
    resumeData: null,
    downloadedAt: null,
    verifiedAt: null,
    ...overrides,
  };
}

describe('downloads repository', () => {
  it('writes a row and reads it back with every column', () => {
    upsertDownload(row(100, { sizeBytes: 5000, status: 'done', progress: 1, downloadedAt: 10, verifiedAt: 10 }), {
      db: executor,
    });

    expect(getDownload(100, { db: executor })).toEqual({
      audioFileId: 100,
      reciterResourceId: 30,
      chapterId: 100,
      audioUrl: 'https://example.test/100.mp3',
      sourceSizeBytes: 839_808,
      localPath: 'audio/30/100.mp3',
      sizeBytes: 5000,
      status: 'done',
      progress: 1,
      resumeData: null,
      downloadedAt: 10,
      verifiedAt: 10,
    });
    expect(getDownload(999, { db: executor })).toBeUndefined();
  });

  it('replaces the row for the same audio file on upsert', () => {
    upsertDownload(row(100), { db: executor });
    upsertDownload(row(100, { status: 'failed', progress: 0.4 }), { db: executor });

    expect(listDownloads({ db: executor })).toHaveLength(1);
    expect(getDownload(100, { db: executor })).toMatchObject({ status: 'failed', progress: 0.4 });
  });

  it('patches only the given fields', () => {
    upsertDownload(row(100, { sizeBytes: 1 }), { db: executor });

    patchDownload(100, { status: 'downloading', progress: 0.5, sizeBytes: undefined }, { db: executor });

    expect(getDownload(100, { db: executor })).toMatchObject({ status: 'downloading', progress: 0.5, sizeBytes: 1 });
    patchDownload(999, { status: 'done' }, { db: executor });
    expect(listDownloads({ db: executor })).toHaveLength(1);
  });

  it('lists one reciter\'s rows in surah order and counts only the done ones', () => {
    upsertDownload(row(3, { chapterId: 2, status: 'done' }), { db: executor });
    upsertDownload(row(1, { chapterId: 1, status: 'done' }), { db: executor });
    upsertDownload(row(2, { chapterId: 2, status: 'queued' }), { db: executor });
    upsertDownload(row(4, { reciterResourceId: 31, chapterId: 1, status: 'done' }), { db: executor });

    expect(listDownloadsForReciter(30, { db: executor }).map((item) => item.audioFileId)).toEqual([1, 2, 3]);
    expect(countDoneForReciter(30, { db: executor })).toBe(2);
    expect(countDoneForReciter(31, { db: executor })).toBe(1);
    expect(countDoneForReciter(99, { db: executor })).toBe(0);
  });

  it('lists rows by status and moves them between statuses', () => {
    upsertDownload(row(1, { status: 'queued' }), { db: executor });
    upsertDownload(row(2, { status: 'paused' }), { db: executor });
    upsertDownload(row(3, { status: 'done' }), { db: executor });

    expect(listDownloadsByStatus(['queued', 'paused'], { db: executor }).map((item) => item.audioFileId)).toEqual([1, 2]);
    expect(listDownloadsByStatus([], { db: executor })).toEqual([]);

    moveDownloadsToStatus(['queued', 'paused'], 'waiting_wifi', { db: executor });

    expect(listDownloadsByStatus(['waiting_wifi'], { db: executor }).map((item) => item.audioFileId)).toEqual([1, 2]);
    expect(getDownload(3, { db: executor })?.status).toBe('done');
  });

  it('deletes one row', () => {
    upsertDownload(row(1), { db: executor });
    upsertDownload(row(2), { db: executor });

    deleteDownload(1, { db: executor });

    expect(listDownloads({ db: executor }).map((item) => item.audioFileId)).toEqual([2]);
  });

  it('stores resume data as text and reads it back unchanged', () => {
    upsertDownload(row(7, { status: 'paused', resumeData: '{"resumeData":"x"}' }), { db: executor });

    expect(getDownload(7, { db: executor })?.resumeData).toBe('{"resumeData":"x"}');
  });
});

describe('needsVerification and verifyNeededCounts', () => {
  const now = 1_000_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;

  it('needs verifying a finished download older than 7 days, or never verified', () => {
    expect(needsVerification({ status: 'done', verifiedAt: now - 8 * DAY }, now)).toBe(true);
    expect(needsVerification({ status: 'done', verifiedAt: null }, now)).toBe(true);
  });

  it('does not need verifying one verified within 7 days, nor a download that is not done', () => {
    expect(needsVerification({ status: 'done', verifiedAt: now - DAY }, now)).toBe(false);
    expect(needsVerification({ status: 'downloading', verifiedAt: null }, now)).toBe(false);
  });

  it('counts the surahs that need verifying per reciter, and leaves a reciter with none out', () => {
    const counts = verifyNeededCounts(
      [
        { reciterResourceId: 30, status: 'done', verifiedAt: now - 8 * DAY },
        { reciterResourceId: 30, status: 'done', verifiedAt: now - 9 * DAY },
        { reciterResourceId: 30, status: 'done', verifiedAt: now - DAY },
        { reciterResourceId: 31, status: 'done', verifiedAt: now - DAY },
      ],
      now,
    );

    expect(counts).toEqual({ 30: 2 });
  });
});

describe('isPlayableOffline', () => {
  const verifiedAt = 1_000_000_000_000;

  it('is true for a done file verified within 7 days, including exactly 7 days', () => {
    expect(isPlayableOffline({ status: 'done', verifiedAt }, verifiedAt)).toBe(true);
    expect(isPlayableOffline({ status: 'done', verifiedAt }, verifiedAt + OFFLINE_VERIFY_WINDOW_MS)).toBe(true);
  });

  it('is false one millisecond after the 7-day window', () => {
    expect(isPlayableOffline({ status: 'done', verifiedAt }, verifiedAt + OFFLINE_VERIFY_WINDOW_MS + 1)).toBe(false);
  });

  it('is false when the file was never verified, or is not done', () => {
    expect(isPlayableOffline({ status: 'done', verifiedAt: null }, verifiedAt)).toBe(false);
    expect(isPlayableOffline({ status: 'downloading', verifiedAt }, verifiedAt)).toBe(false);
    expect(isPlayableOffline({ status: 'failed', verifiedAt }, verifiedAt)).toBe(false);
  });

  it('uses the current time when none is given', () => {
    const now = Date.now();
    expect(isPlayableOffline({ status: 'done', verifiedAt: now })).toBe(true);
    expect(isPlayableOffline({ status: 'done', verifiedAt: now - OFFLINE_VERIFY_WINDOW_MS - 1000 })).toBe(false);
  });
});
