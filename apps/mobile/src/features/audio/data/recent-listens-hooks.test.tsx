import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/user/schema';

import { openUserTestStore } from '../../../../jest/user-test-db';
import { upsertRecentListen } from './recent-listens';
import { useRecentListens } from './recent-listens-hooks';

// The real drizzle useLiveQuery runs here; the test emits the table change that expo-sqlite would after a write.
type ChangeListener = (event: { tableName: string }) => void;
const mockChangeListeners = new Set<ChangeListener>();

jest.mock('expo-sqlite', () => ({
  addDatabaseChangeListener: (listener: ChangeListener) => {
    mockChangeListeners.add(listener);
    return {
      remove: () => {
        mockChangeListeners.delete(listener);
      },
    };
  },
}));

let mockUserDb: { db: unknown; executor: SqlExecutor } | undefined;

jest.mock('@/core/db/user/open', () => ({
  openUserDb: () => mockUserDb,
  useUserDb: () => ({ ready: true, error: null }),
}));

function emitTableChange(tableName: string) {
  for (const listener of [...mockChangeListeners]) {
    listener({ tableName });
  }
}

type SqlParam = string | number | bigint | Uint8Array | null;

// A drizzle driver over the same in-memory node:sqlite database the executor writes to.
function proxyDb(database: DatabaseSync) {
  return drizzle(
    async (sql, params, method) => {
      const statement = database.prepare(sql);
      const values = params as SqlParam[];
      if (method === 'run') {
        statement.run(...values);
        return { rows: [] };
      }
      const rows = statement.all(...values) as Record<string, unknown>[];
      if (method === 'get') {
        return { rows: rows[0] === undefined ? [] : Object.values(rows[0]) };
      }
      return { rows: rows.map((row) => Object.values(row)) };
    },
    { schema },
  );
}

async function writeAndEmit(write: () => void) {
  await act(async () => {
    write();
    emitTableChange('recent_listens');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useRecentListens against a live database', () => {
  let database: DatabaseSync;
  let store: ReturnType<typeof openUserTestStore>['store'];

  beforeEach(() => {
    const opened = openUserTestStore();
    database = opened.database;
    store = opened.store;
    mockUserDb = { db: proxyDb(database), executor: store.db! };
    mockChangeListeners.clear();
  });

  afterEach(() => {
    database.close();
  });

  it('re-reads the newest listens when one is written, and honours the limit', async () => {
    const view = await renderHook(() => useRecentListens(2));
    await settle();
    expect(view.result.current.data).toEqual([]);

    await writeAndEmit(() => upsertRecentListen({ audioFileId: 100, reciterResourceId: 30, chapterId: 1, lastPositionMs: 5, playedAt: 1 }, { db: store.db }));
    await writeAndEmit(() => upsertRecentListen({ audioFileId: 200, reciterResourceId: 31, chapterId: 2, lastPositionMs: 9, playedAt: 2 }, { db: store.db }));
    await writeAndEmit(() => upsertRecentListen({ audioFileId: 300, reciterResourceId: 31, chapterId: 3, lastPositionMs: 7, playedAt: 3 }, { db: store.db }));

    expect(view.result.current.data.map((row) => row.audioFileId)).toEqual([300, 200]);
    expect(view.result.current.data[0]).toEqual({
      audioFileId: 300,
      reciterResourceId: 31,
      chapterId: 3,
      lastPositionMs: 7,
      playedAt: 3,
    });
  });
});
