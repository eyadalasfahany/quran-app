import { act, renderHook } from '@testing-library/react-native';

import { useAllHighlights, useAllNotes, useBookmarks, useHighlights, useHighlightsByVerseId, useNotes } from './hooks';

type CapturedQuery = {
  sql: string;
  params: unknown[];
  deps: unknown[] | undefined;
};

const mockQueries: CapturedQuery[] = [];
// The rows the next live-query render sees; the highlight tests swap them to mimic a write.
let mockLiveRows: unknown[] = [];

jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: (query: { toSQL: () => { sql: string; params: unknown[] } }, deps?: unknown[]) => {
    const built = query.toSQL();
    mockQueries.push({ sql: built.sql, params: built.params, deps });
    return { data: mockLiveRows, error: undefined, updatedAt: undefined };
  },
}));

jest.mock('@/core/db/user/open', () => {
  // The mock factory runs before imports exist, so the proxy database is built here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/sqlite-proxy') as typeof import('drizzle-orm/sqlite-proxy');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require('@/core/db/user/schema') as typeof import('@/core/db/user/schema');
  const db = drizzle(async () => ({ rows: [] }), { schema });
  return {
    openUserDb: () => ({ db }),
    useUserDb: () => ({ ready: true, error: null }),
  };
});

describe('user data hooks', () => {
  beforeEach(() => {
    mockQueries.length = 0;
    mockLiveRows = [];
  });

  it('maps every live highlight to its verse, and keeps the map until the rows change', async () => {
    const rows = [
      { id: 'a', verseId: 2, color: 'gold', clientUpdatedAt: 1 },
      { id: 'b', verseId: 5, color: 'rose', clientUpdatedAt: 2 },
    ];
    mockLiveRows = rows;
    const view = await renderHook((_props: { tick: number }) => useHighlightsByVerseId(), {
      initialProps: { tick: 0 },
    });

    expect(view.result.current).toEqual(
      new Map([
        [2, 'gold'],
        [5, 'rose'],
      ]),
    );
    expect(mockQueries.at(-1)?.sql.toLowerCase()).toContain('deleted_at');

    const first = view.result.current;
    await act(async () => {
      await view.rerender({ tick: 1 });
    });
    expect(view.result.current).toBe(first);
  });

  it('updates the map when a highlight is set, changed or cleared', async () => {
    mockLiveRows = [{ id: 'a', verseId: 2, color: 'gold', clientUpdatedAt: 1 }];
    // A changing prop makes each rerender run the hook again.
    const view = await renderHook((_props: { tick: number }) => useHighlightsByVerseId(), {
      initialProps: { tick: 0 },
    });

    mockLiveRows = [
      { id: 'a', verseId: 2, color: 'green', clientUpdatedAt: 3 },
      { id: 'c', verseId: 9, color: 'blue', clientUpdatedAt: 4 },
    ];
    await act(async () => {
      await view.rerender({ tick: 1 });
    });
    expect(view.result.current).toEqual(
      new Map([
        [2, 'green'],
        [9, 'blue'],
      ]),
    );

    mockLiveRows = [{ id: 'c', verseId: 9, color: 'blue', clientUpdatedAt: 4 }];
    await act(async () => {
      await view.rerender({ tick: 2 });
    });
    expect(view.result.current.has(2)).toBe(false);
    expect(view.result.current.get(9)).toBe('blue');
  });

  it('watches live bookmarks, highlights and notes', async () => {
    const view = await renderHook(() => ({
      bookmarks: useBookmarks(),
      highlights: useHighlights([2, 5]),
      empty: useHighlights([]),
      notes: useNotes(262),
    }));

    expect(view.result.current.bookmarks).toEqual({ data: [], error: undefined, updatedAt: undefined });
    expect(view.result.current.highlights.data).toEqual([]);
    expect(view.result.current.empty.data).toEqual([]);
    expect(view.result.current.notes.data).toEqual([]);

    expect(mockQueries[0]?.sql.toLowerCase()).toContain('deleted_at');
    expect(mockQueries[0]?.sql).toContain('bookmarks');

    expect(mockQueries[1]?.sql.toLowerCase()).toContain('deleted_at');
    expect(mockQueries[1]?.params).toEqual([2, 5]);
    expect(mockQueries[1]?.deps).toEqual(['2,5']);

    expect(mockQueries[2]?.sql).toContain('1 = 0');
    expect(mockQueries[2]?.deps).toEqual(['']);

    expect(mockQueries[3]?.sql.toLowerCase()).toContain('deleted_at');
    expect(mockQueries[3]?.params).toEqual([262]);
    expect(mockQueries[3]?.deps).toEqual([262]);
  });

  it('watches every live highlight and note, newest first', async () => {
    const view = await renderHook(() => ({
      highlights: useAllHighlights(),
      notes: useAllNotes(),
    }));

    expect(view.result.current.highlights.data).toEqual([]);
    expect(view.result.current.notes.data).toEqual([]);

    const highlightsSql = mockQueries[0]?.sql.toLowerCase() ?? '';
    expect(highlightsSql).toContain('highlights');
    expect(highlightsSql).toContain('deleted_at');
    expect(highlightsSql).toContain('client_updated_at" desc');

    const notesSql = mockQueries[1]?.sql.toLowerCase() ?? '';
    expect(notesSql).toContain('notes');
    expect(notesSql).toContain('deleted_at');
    expect(notesSql).toContain('client_updated_at" desc');
  });
});
