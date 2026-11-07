import { renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import { useHadithSearch } from './useHadithSearch';

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
}));

describe('useHadithSearch', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    loadHadithDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('returns nothing and hasTokens false for an empty query', async () => {
    const { result } = await renderHook(() => useHadithSearch({ query: '', scope: null, limit: 50 }));
    expect(result.current).toEqual({ hits: [], hasMore: false, total: 0, hasTokens: false });
  });

  it('finds hits with ranges on the original text', async () => {
    const { result } = await renderHook(() => useHadithSearch({ query: 'تجريبي', scope: null, limit: 50 }));
    expect(result.current.hasTokens).toBe(true);
    expect(result.current.hits.map((hit) => hit.item.id)).toEqual([5]);
    const [hit] = result.current.hits;
    const [range] = hit?.ranges ?? [];
    expect(hit?.item.textAr.slice(range?.start, range?.end)).toBe('تجريبي');
  });

  it('scope limits the hits to one collection', async () => {
    const { result } = await renderHook(() =>
      useHadithSearch({ query: 'FIXTURE', scope: FIXTURE_SINGLE.slug, limit: 50 }),
    );
    expect(result.current.hits.every((hit) => hit.collection.slug === FIXTURE_SINGLE.slug)).toBe(true);
    expect(result.current.total).toBe(3);
  });

  it('limit and hasMore page the hits', async () => {
    const { result } = await renderHook(() => useHadithSearch({ query: 'FIXTURE', scope: FIXTURE_MULTI.slug, limit: 4 }));
    expect(result.current.hits).toHaveLength(4);
    expect(result.current.hasMore).toBe(true);
  });

  it('total counts every match, not the page', async () => {
    const { result } = await renderHook(() => useHadithSearch({ query: 'FIXTURE', scope: null, limit: 2 }));
    expect(result.current.hits).toHaveLength(2);
    expect(result.current.total).toBe(9);
  });

  it('normalised query finds the same total for diacritic and plain forms', async () => {
    const plain = await renderHook(() => useHadithSearch({ query: 'حديثا', scope: null, limit: 50 }));
    const marked = await renderHook(() => useHadithSearch({ query: 'حَدِيثًا', scope: null, limit: 50 }));
    expect(plain.result.current.total).toBe(marked.result.current.total);
    expect(normalizeHadithForSearch('حَدِيثًا')).toBe(normalizeHadithForSearch('حديثا'));
  });

  it('returns no hits when the content database is not open', async () => {
    mockOpen = () => {
      throw new Error('not open');
    };
    const { result } = await renderHook(() => useHadithSearch({ query: 'FIXTURE', scope: null, limit: 50 }));
    expect(result.current.hits).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
