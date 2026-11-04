import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/user/schema';
import { upsertDownload, type DownloadRow } from '@/features/audio/data/downloads';

import { openUserTestStore } from '../../../../jest/user-test-db';

import { useAudioStorageSummary, type ReciterAudioSummary } from './useAudioStorageSummary';

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

describe('useAudioStorageSummary', () => {
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

  it('returns empty summary when the downloads table is empty', async () => {
    const view = await renderHook(() => useAudioStorageSummary());
    await settle();
    expect(view.result.current.perReciter).toEqual([]);
    expect(view.result.current.totalBytes).toBe(0);
  });

  it('counts done rows per reciter and excludes non-done statuses', async () => {
    const view = await renderHook(() => useAudioStorageSummary());
    await settle();

    await writeAndEmit(() => upsertDownload(row(1, 10, { status: 'done', sizeBytes: 5000 }), { db: store.db }));
    await writeAndEmit(() => upsertDownload(row(2, 10, { status: 'done', sizeBytes: 3000 }), { db: store.db }));
    await writeAndEmit(() => upsertDownload(row(3, 10, { status: 'queued', sizeBytes: 999 }), { db: store.db }));
    await writeAndEmit(() => upsertDownload(row(4, 20, { status: 'done', sizeBytes: 1000 }), { db: store.db }));

    const reciter10 = view.result.current.perReciter.find((r: ReciterAudioSummary) => r.reciterResourceId === 10);
    const reciter20 = view.result.current.perReciter.find((r: ReciterAudioSummary) => r.reciterResourceId === 20);
    expect(reciter10).toEqual({ reciterResourceId: 10, surahCount: 2, bytes: 8000 });
    expect(reciter20).toEqual({ reciterResourceId: 20, surahCount: 1, bytes: 1000 });
    expect(view.result.current.totalBytes).toBe(9000);
  });

  it('handles null sizeBytes as zero bytes', async () => {
    const view = await renderHook(() => useAudioStorageSummary());
    await settle();

    await writeAndEmit(() => upsertDownload(row(1, 10, { status: 'done', sizeBytes: null }), { db: store.db }));

    expect(view.result.current.perReciter).toEqual([{ reciterResourceId: 10, surahCount: 1, bytes: 0 }]);
    expect(view.result.current.totalBytes).toBe(0);
  });

  it('updates when a new done row is written', async () => {
    const view = await renderHook(() => useAudioStorageSummary());
    await settle();
    expect(view.result.current.perReciter).toEqual([]);

    await writeAndEmit(() => upsertDownload(row(1, 30, { status: 'done', sizeBytes: 42 }), { db: store.db }));

    expect(view.result.current.perReciter).toEqual([{ reciterResourceId: 30, surahCount: 1, bytes: 42 }]);
    expect(view.result.current.totalBytes).toBe(42);
  });
});
