import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import {
  useBookChapters,
  useBookHadith,
  useChapterHadith,
  useHadithAvailable,
  useHadithBook,
  useHadithBooks,
  useHadithCatalog,
  useHadithCollection,
  useHadithReader,
  useInstalledHadithCollections,
} from './hooks';

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
}));

const LONG_SLUG = 'fixture-long';
const LONG_RESOURCE = -3;
const LONG_COUNT = 120;

describe('hadith hooks', () => {
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

  it('useHadithAvailable is false before and true after the fixtures load', async () => {
    const { result } = await renderHook(() => useHadithAvailable());
    expect(result.current).toBe(false);
    await act(async () => {
      loadHadithDevFixtures(executor);
      bumpCatalogVersion();
    });
    expect(result.current).toBe(true);
  });

  it('useInstalledHadithCollections lists both fixture collections', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useInstalledHadithCollections());
    expect(result.current.map((item) => item.slug)).toEqual([FIXTURE_SINGLE.slug, FIXTURE_MULTI.slug]);
  });

  it('useHadithCollection returns undefined for an unknown slug', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useHadithCollection('unknown-slug'));
    expect(result.current).toBeUndefined();
    const { result: known } = await renderHook(() => useHadithCollection(FIXTURE_MULTI.slug));
    expect(known.current?.slug).toBe(FIXTURE_MULTI.slug);
  });

  it('useHadithCatalog lists the catalogue', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useHadithCatalog());
    expect(result.current.map((entry) => entry.resourceId)).toEqual([FIXTURE_SINGLE.resourceId, FIXTURE_MULTI.resourceId]);
    expect(result.current.every((entry) => entry.installed)).toBe(true);
  });

  it('useHadithBooks lists the books', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useHadithBooks(FIXTURE_MULTI.slug));
    expect(result.current.map((book) => book.id)).toEqual([1, 2, 3]);
  });

  it('useHadithBook returns one book', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useHadithBook(FIXTURE_MULTI.slug, 2));
    expect(result.current?.bookNumber).toBe('2');
  });

  it('useBookChapters is empty for a flat book', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useBookChapters(FIXTURE_MULTI.slug, 2));
    expect(result.current).toEqual([]);
  });

  it('useBookHadith lists a flat book', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useBookHadith(FIXTURE_MULTI.slug, 2));
    expect(result.current.items.map((item) => item.hadithNumber)).toEqual(['3', '3.1', '4']);
    expect(result.current.hasMore).toBe(false);
  });

  it('useChapterHadith lists one chapter', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useChapterHadith(FIXTURE_MULTI.slug, 2));
    expect(result.current.items.map((item) => item.id)).toEqual([2]);
  });

  it('useHadithReader returns previous and next', async () => {
    loadHadithDevFixtures(executor);
    const { result } = await renderHook(() => useHadithReader(FIXTURE_MULTI.slug, '3.1'));
    expect(result.current?.previous?.hadithNumber).toBe('3');
    expect(result.current?.next?.hadithNumber).toBe('4');
  });

  it('pages a long book fifty rows at a time and stops at the end', async () => {
    loadHadithDevFixtures(executor);
    insertLongBook(executor);
    const { result } = await renderHook(() => useBookHadith(LONG_SLUG, 1));

    expect(result.current.items).toHaveLength(50);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(result.current.items).toHaveLength(100);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(result.current.items).toHaveLength(LONG_COUNT);
    expect(result.current.hasMore).toBe(false);

    await act(async () => result.current.loadMore());
    expect(result.current.items).toHaveLength(LONG_COUNT);
  });

  it('resets the page count when the book changes', async () => {
    loadHadithDevFixtures(executor);
    insertLongBook(executor);
    const { result, rerender } = await renderHook(({ bookId }: { bookId: number }) => useBookHadith(LONG_SLUG, bookId), {
      initialProps: { bookId: 1 },
    });
    await act(async () => result.current.loadMore());
    expect(result.current.items).toHaveLength(100);

    await rerender({ bookId: 2 });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });

  it('pages a chapter list the same way', async () => {
    loadHadithDevFixtures(executor);
    insertLongBook(executor);
    const { result } = await renderHook(() => useChapterHadith(LONG_SLUG, 1));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });
});

/** A test-local resource with one book of LONG_COUNT placeholder rows, to exercise the paged hooks. */
function insertLongBook(executor: SqlExecutor): void {
  executor.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'hadith_collections', 1, 'x', 0)`, [LONG_RESOURCE]);
  executor.run(
    `INSERT INTO hadith_collections (resource_id, id, slug, source_code, title_ar, title_en, author_ar, author_en, attribution_ar, attribution_en, source_url, total_hadith, books_count)
     VALUES (?, 1, ?, 'taybah-dev-fixture', NULL, NULL, NULL, NULL, 'FIXTURE attribution', 'FIXTURE attribution', NULL, ?, 2)`,
    [LONG_RESOURCE, LONG_SLUG, LONG_COUNT],
  );
  executor.run(
    `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count) VALUES (?, 1, '1', NULL, NULL, 1, ?), (?, 2, '2', NULL, NULL, 2, 3)`,
    [LONG_RESOURCE, LONG_COUNT, LONG_RESOURCE],
  );
  for (let id = 1; id <= LONG_COUNT; id += 1) {
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url)
       VALUES (?, ?, 1, NULL, ?, NULL, ?, ?, NULL, NULL, ?, NULL)`,
      [LONG_RESOURCE, id, String(id), id, `FIXTURE text ${id} — not a hadith`, `fixture text ${id}`],
    );
  }
  for (let id = 1; id <= 3; id += 1) {
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url)
       VALUES (?, ?, 2, NULL, ?, NULL, ?, ?, NULL, NULL, ?, NULL)`,
      [LONG_RESOURCE, 1000 + id, `b2-${id}`, id, `FIXTURE text b2-${id}`, `fixture text b2-${id}`],
    );
  }
}
