import type { SqlExecutor } from '@/core/db/sql-executor';

import { openUserTestStore } from '../../../../jest/user-test-db';
import { listRecentListens, RECENT_LISTENS_CAP, upsertRecentListen, type RecentListen } from './recent-listens';

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

function listen(audioFileId: number, playedAt: number, overrides: Partial<RecentListen> = {}): RecentListen {
  return {
    audioFileId,
    reciterResourceId: 30,
    chapterId: audioFileId,
    lastPositionMs: 1000,
    playedAt,
    ...overrides,
  };
}

describe('recent listens', () => {
  it('keeps one row per audio file, updated in place', () => {
    upsertRecentListen(listen(100, 1000, { lastPositionMs: 1000 }), { db: executor });
    upsertRecentListen(listen(100, 2000, { lastPositionMs: 42_000, reciterResourceId: 31 }), { db: executor });

    expect(listRecentListens(20, { db: executor })).toEqual([
      { audioFileId: 100, reciterResourceId: 31, chapterId: 100, lastPositionMs: 42_000, playedAt: 2000 },
    ]);
  });

  it('prunes to the 20 most recent rows', () => {
    expect(RECENT_LISTENS_CAP).toBe(20);
    for (let id = 1; id <= 22; id += 1) {
      upsertRecentListen(listen(id, id * 10), { db: executor });
    }

    const rows = listRecentListens(100, { db: executor });

    expect(rows).toHaveLength(20);
    expect(rows.map((row) => row.audioFileId)).toEqual(Array.from({ length: 20 }, (_, index) => 22 - index));
  });

  it('moves a re-played file to the front without adding a row', () => {
    for (let id = 1; id <= 20; id += 1) {
      upsertRecentListen(listen(id, id), { db: executor });
    }
    upsertRecentListen(listen(1, 500), { db: executor });

    const ids = listRecentListens(20, { db: executor }).map((row) => row.audioFileId);
    expect(ids[0]).toBe(1);
    expect(ids).toHaveLength(20);
  });

  it('lists the newest first and honours the limit', () => {
    upsertRecentListen(listen(1, 100), { db: executor });
    upsertRecentListen(listen(2, 300), { db: executor });
    upsertRecentListen(listen(3, 200), { db: executor });

    expect(listRecentListens(2, { db: executor }).map((row) => row.audioFileId)).toEqual([2, 3]);
    expect(listRecentListens(0, { db: executor })).toEqual([]);
  });
});
