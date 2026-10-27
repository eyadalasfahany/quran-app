import { renderHook } from '@testing-library/react-native';

import { useBookmarks, useHighlights, useNotes } from './hooks';

type CapturedQuery = {
  sql: string;
  params: unknown[];
  deps: unknown[] | undefined;
};

const mockQueries: CapturedQuery[] = [];

jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: (query: { toSQL: () => { sql: string; params: unknown[] } }, deps?: unknown[]) => {
    const built = query.toSQL();
    mockQueries.push({ sql: built.sql, params: built.params, deps });
    return { data: [], error: undefined, updatedAt: undefined };
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
});
