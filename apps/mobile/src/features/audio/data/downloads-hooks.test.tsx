import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/user/schema';

import { openUserTestStore } from '../../../../jest/user-test-db';
import { upsertDownload, type DownloadRow } from './downloads';
import { useReciterDownloads } from './downloads';

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

function row(audioFileId: number, reciterResourceId: number, overrides: Partial<DownloadRow> = {}): DownloadRow {
  return {
    audioFileId,
    reciterResourceId,
    chapterId: audioFileId,
    audioUrl: `https://example.test/${audioFileId}.mp3`,
    sourceSizeBytes: null,
    localPath: `audio/${reciterResourceId}/${audioFileId}.mp3`,
    sizeBytes: null,
    status: 'queued',
    progress: 0,
    resumeData: null,
    downloadedAt: null,
    verifiedAt: null,
    ...overrides,
  };
}

async function writeAndEmit(write: () => void) {
  await act(async () => {
    write();
    emitTableChange('downloads');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useReciterDownloads against a live database', () => {
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

  it("re-reads one reciter's rows in surah order when a row is written", async () => {
    const view = await renderHook(() => useReciterDownloads(30));
    await settle();
    expect(view.result.current.data).toEqual([]);

    await writeAndEmit(() => upsertDownload(row(2, 30, { status: 'queued' }), { db: store.db }));
    await writeAndEmit(() => upsertDownload(row(1, 30, { status: 'done', sizeBytes: 9, verifiedAt: 5 }), { db: store.db }));
    await writeAndEmit(() => upsertDownload(row(3, 31), { db: store.db }));

    expect(view.result.current.data).toEqual([
      expect.objectContaining({ audioFileId: 1, chapterId: 1, status: 'done', sizeBytes: 9, verifiedAt: 5 }),
      expect.objectContaining({ audioFileId: 2, chapterId: 2, status: 'queued' }),
    ]);
  });
});
