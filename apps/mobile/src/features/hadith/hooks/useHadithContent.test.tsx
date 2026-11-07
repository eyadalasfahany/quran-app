import { renderHook, act } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import { useHadithContent } from './useHadithContent';

// Names that start with `mock` may be used inside the factory.
let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
}));

const EMPTY: string[] = [];

describe('useHadithContent', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
  });

  afterEach(() => {
    database.close();
  });

  it('returns the fallback when the database is not open', async () => {
    mockOpen = () => {
      throw new Error('not open');
    };
    const { result } = await renderHook(() => useHadithContent(EMPTY, () => ['read'], []));
    expect(result.current).toBe(EMPTY);
  });

  it('returns the fallback when the read throws (a missing table)', async () => {
    const { result } = await renderHook(() =>
      useHadithContent(EMPTY, () => {
        throw new Error('no such table');
      }, []),
    );
    expect(result.current).toBe(EMPTY);
  });

  it('returns the fallback constant by reference so renders stay stable', async () => {
    const { result, rerender } = await renderHook(() => useHadithContent(EMPTY, () => EMPTY, []));
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
    expect(first).toBe(EMPTY);
  });

  it('re-reads when the catalogue version changes', async () => {
    const { result } = await renderHook(() =>
      useHadithContent(0, (db) => db.all<{ one: number }>('SELECT 1 AS one').length + 1, []),
    );
    expect(result.current).toBe(2);

    // The read result depends on the rows, so loading the fixtures and bumping the version shows the new data.
    const { result: counted } = await renderHook(() =>
      useHadithContent(-1, (db) => db.all<{ id: number }>('SELECT id FROM hadith_entries').length, []),
    );
    expect(counted.current).toBe(0);
    await act(async () => {
      loadHadithDevFixtures(executor);
      bumpCatalogVersion();
    });
    expect(counted.current).toBe(7 + 3);
  });

  it('re-reads when the arguments change', async () => {
    loadHadithDevFixtures(executor);
    const { result, rerender } = await renderHook(
      ({ slug }: { slug: string }) =>
        useHadithContent<string | null>(null, (db) => db.get<{ slug: string }>('SELECT slug FROM hadith_collections WHERE slug = ?', [slug])?.slug ?? null, [slug]),
      { initialProps: { slug: 'fixture-multi' } },
    );
    expect(result.current).toBe('fixture-multi');
    await rerender({ slug: 'fixture-single' });
    expect(result.current).toBe('fixture-single');
  });
});
