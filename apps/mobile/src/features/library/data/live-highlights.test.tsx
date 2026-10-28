import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/user/schema';

import { openUserTestStore } from '../../../../jest/user-test-db';
import { useHighlightsByVerseId } from './hooks';
import { setHighlight } from './repository';

// The real drizzle useLiveQuery runs here. expo-sqlite fires a table-change event after a write
// on a connection opened with enableChangeListener; the test emits that event after each write.
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

// A drizzle driver over the same in-memory node:sqlite database the executor writes to.
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

// Writes and events run inside act so React commits the re-render before the assertion.
async function writeAndEmit(write: () => void) {
  await act(async () => {
    write();
    emitTableChange('highlights');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useHighlightsByVerseId against a live database', () => {
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

  it('re-renders the highlight map when a highlight is written after mount', async () => {
    const view = await renderHook(() => useHighlightsByVerseId());
    await settle();
    expect(view.result.current.size).toBe(0);

    await writeAndEmit(() => setHighlight(2, 'green', store));

    expect(view.result.current).toEqual(new Map([[2, 'green']]));
  });

  it('replaces a changed colour and drops a cleared highlight on the change event', async () => {
    const view = await renderHook(() => useHighlightsByVerseId());
    await settle();

    await writeAndEmit(() => setHighlight(2, 'gold', store));
    expect(view.result.current.get(2)).toBe('gold');

    await writeAndEmit(() => setHighlight(2, 'blue', store));
    expect(view.result.current.get(2)).toBe('blue');

    await writeAndEmit(() => setHighlight(2, null, store));
    expect(view.result.current.has(2)).toBe(false);
  });
});
