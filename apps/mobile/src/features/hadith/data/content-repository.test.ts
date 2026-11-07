import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from './__fixtures__/dev-fixtures';
import {
  getBook,
  getCollection,
  getHadith,
  getHadithNeighbours,
  getHadithReaderData,
  hasHadithContent,
  listBookHadith,
  listBooks,
  listChapterHadith,
  listChapters,
  listHadithCatalog,
  listInstalledCollections,
} from './content-repository';

const DETAIL_KEYS = [
  'arabicNumber',
  'book',
  'bookId',
  'chapter',
  'chapterId',
  'collection',
  'hadithNumber',
  'id',
  'position',
  'resourceId',
  'sourceUrl',
  'textAr',
].sort();

function installCollection(executor: SqlExecutor, resourceId: number, slug: string, title: string | null): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'hadith_collections', 1, 'x', 0)`,
    [resourceId],
  );
  executor.run(
    `INSERT INTO hadith_collections (resource_id, id, slug, source_code, title_ar, title_en, author_ar, author_en, attribution_ar, attribution_en, source_url, total_hadith, books_count)
     VALUES (?, 1, ?, 'taybah-dev-fixture', ?, NULL, NULL, NULL, 'FIXTURE attribution', 'FIXTURE attribution', NULL, 0, 0)`,
    [resourceId, slug, title],
  );
}

describe('content repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('reports no content until a collection is installed', () => {
    expect(hasHadithContent(executor)).toBe(false);
    loadHadithDevFixtures(executor);
    expect(hasHadithContent(executor)).toBe(true);
  });

  it('lists installed collections in the fixed order and omits uninstalled rows', () => {
    loadHadithDevFixtures(executor);
    executor.run(
      `INSERT INTO hadith_collections (resource_id, id, slug, source_code, title_ar, title_en, author_ar, author_en, attribution_ar, attribution_en, source_url, total_hadith, books_count)
       VALUES (77, 1, 'uninstalled-slug', 'taybah-dev-fixture', NULL, NULL, NULL, NULL, 'FIXTURE attribution', 'FIXTURE attribution', NULL, 0, 0)`,
    );
    installCollection(executor, 82, 'muslim', null);
    installCollection(executor, 81, 'bukhari', null);

    const list = listInstalledCollections(executor);
    expect(list.map((item) => item.slug)).toEqual(['bukhari', 'muslim', 'fixture-single', 'fixture-multi']);
    expect(list.map((item) => item.slug)).not.toContain('uninstalled-slug');
    expect(at(list, 0).number).toBe(1);
    expect(at(list, 1).number).toBe(2);
  });

  it('opens a canonical single-book collection straight to its hadith', () => {
    installCollection(executor, 83, 'nawawi40', null);
    executor.run(
      `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count) VALUES
        (83, 1, '1', NULL, NULL, 1, 2), (83, 2, '2', NULL, NULL, 2, 0)`,
    );
    const collection = getCollection(executor, 'nawawi40');
    expect(collection?.soleBookId).toBe(1);
    expect(collection?.number).toBe(8);
  });

  it('numbers unknown slugs after the ten canonical ones', () => {
    loadHadithDevFixtures(executor);
    expect(getCollection(executor, FIXTURE_SINGLE.slug)?.number).toBe(11);
    expect(getCollection(executor, FIXTURE_MULTI.slug)?.number).toBe(12);
  });

  it('keeps a null Arabic collection title null', () => {
    loadHadithDevFixtures(executor);
    expect(getCollection(executor, FIXTURE_MULTI.slug)?.titleAr).toBeNull();
    expect(getCollection(executor, FIXTURE_SINGLE.slug)?.titleAr).toBe('[عنوان تجريبي]');
  });

  it('marks a single-book collection with its sole book id', () => {
    loadHadithDevFixtures(executor);
    expect(getCollection(executor, FIXTURE_SINGLE.slug)?.soleBookId).toBe(1);
    expect(getCollection(executor, FIXTURE_MULTI.slug)?.soleBookId).toBeNull();
  });

  it('lists the books of a collection in position order with chapter flags', () => {
    loadHadithDevFixtures(executor);
    const books = listBooks(executor, FIXTURE_MULTI.slug);
    expect(books.map((book) => book.id)).toEqual([1, 2, 3]);
    expect(books.map((book) => book.hasChapters)).toEqual([true, false, false]);
    expect(books.map((book) => book.chapterCount)).toEqual([2, 0, 0]);
    expect(at(books, 0).bookNumber).toBe('1');
    expect(at(books, 0).titleAr).toBeNull();
  });

  it('returns an empty chapter list for a flat book', () => {
    loadHadithDevFixtures(executor);
    expect(listChapters(executor, FIXTURE_MULTI.slug, 2)).toEqual([]);
  });

  it('lists chapters of a chaptered book in order', () => {
    loadHadithDevFixtures(executor);
    expect(listChapters(executor, FIXTURE_MULTI.slug, 1).map((chapter) => chapter.id)).toEqual([1, 2]);
  });

  it('lists the hadith of a chapter in position order', () => {
    loadHadithDevFixtures(executor);
    expect(listChapterHadith(executor, FIXTURE_MULTI.slug, 1).map((item) => item.id)).toEqual([1]);
    expect(listChapterHadith(executor, FIXTURE_MULTI.slug, 2).map((item) => item.id)).toEqual([2]);
  });

  it('lists the hadith of a chaptered book across its chapters in position order', () => {
    loadHadithDevFixtures(executor);
    expect(listBookHadith(executor, FIXTURE_MULTI.slug, 1).map((item) => item.hadithNumber)).toEqual(['1', '2']);
  });

  it('lists the hadith of a flat book directly', () => {
    loadHadithDevFixtures(executor);
    expect(listBookHadith(executor, FIXTURE_MULTI.slug, 2).map((item) => item.hadithNumber)).toEqual(['3', '3.1', '4']);
  });

  it('sums chapter hadith counts to the book count for a chaptered book', () => {
    loadHadithDevFixtures(executor);
    const sum = listChapters(executor, FIXTURE_MULTI.slug, 1).reduce((total, chapter) => total + chapter.hadithCount, 0);
    expect(sum).toBe(getBook(executor, FIXTURE_MULTI.slug, 1)?.hadithCount);
    expect(sum).toBe(2);
  });

  it('pages a book list with limit and offset', () => {
    loadHadithDevFixtures(executor);
    const page = listBookHadith(executor, FIXTURE_MULTI.slug, 2, { limit: 2, offset: 1 });
    expect(page.map((item) => item.hadithNumber)).toEqual(['3.1', '4']);
  });

  it('finds one hadith by slug and number', () => {
    loadHadithDevFixtures(executor);
    const detail = getHadith(executor, FIXTURE_MULTI.slug, '3.1');
    expect(detail?.id).toBe(4);
    expect(detail?.hadithNumber).toBe('3.1');

    const single = getHadith(executor, FIXTURE_SINGLE.slug, '1');
    expect(single?.resourceId).toBe(FIXTURE_SINGLE.resourceId);
    expect(single?.collection.slug).toBe(FIXTURE_SINGLE.slug);
  });

  it('returns undefined for an unknown slug or number', () => {
    loadHadithDevFixtures(executor);
    expect(getHadith(executor, 'unknown-slug', '1')).toBeUndefined();
    expect(getHadith(executor, FIXTURE_MULTI.slug, '999')).toBeUndefined();
  });

  it('returns the breadcrumb, chapter and source fields of a hadith', () => {
    loadHadithDevFixtures(executor);
    const first = getHadith(executor, FIXTURE_MULTI.slug, '1');
    expect(first?.collection.slug).toBe(FIXTURE_MULTI.slug);
    expect(first?.book.bookNumber).toBe('1');
    expect(first?.chapter?.id).toBe(1);
    expect(getHadith(executor, FIXTURE_MULTI.slug, '3')?.chapter).toBeNull();
    expect(first?.sourceUrl).toBeNull();
  });

  it('returns Arabic text byte for byte', () => {
    loadHadithDevFixtures(executor);
    const detail = getHadith(executor, FIXTURE_MULTI.slug, '5');
    const stored = executor.get<{ textAr: string }>('SELECT text_ar AS textAr FROM hadith_entries WHERE id = 6 AND resource_id = -1');
    expect(Buffer.from(detail?.textAr ?? '', 'utf8').toString('hex')).toBe(Buffer.from(stored?.textAr ?? '', 'utf8').toString('hex'));
    expect(detail?.textAr.endsWith('‏')).toBe(true);
  });

  it('has no grade, English or search field in the view model', () => {
    loadHadithDevFixtures(executor);
    const before = Object.keys(getHadith(executor, FIXTURE_MULTI.slug, '1') ?? {}).sort();
    expect(before).toEqual(DETAIL_KEYS);

    executor.run(
      `INSERT INTO hadith_grades (resource_id, id, entry_id, grade, graded_by) VALUES (-1, 1, 1, 'FIXTURE grade', 'FIXTURE grader')`,
    );
    const after = Object.keys(getHadith(executor, FIXTURE_MULTI.slug, '1') ?? {}).sort();
    expect(after).toEqual(DETAIL_KEYS);
  });

  it('gives previous and next within a book', () => {
    loadHadithDevFixtures(executor);
    const reader = getHadithReaderData(executor, FIXTURE_MULTI.slug, '3.1');
    expect(reader?.previous?.hadithNumber).toBe('3');
    expect(reader?.next?.hadithNumber).toBe('4');
  });

  it('crosses a chapter boundary in position order', () => {
    loadHadithDevFixtures(executor);
    const reader = getHadithReaderData(executor, FIXTURE_MULTI.slug, '1');
    expect(reader?.previous).toBeNull();
    expect(reader?.next?.hadithNumber).toBe('2');
  });

  it('crosses a book boundary', () => {
    loadHadithDevFixtures(executor);
    expect(getHadithReaderData(executor, FIXTURE_MULTI.slug, '4')?.next?.hadithNumber).toBe('5');
    expect(getHadithReaderData(executor, FIXTURE_MULTI.slug, '5')?.previous?.hadithNumber).toBe('4');
  });

  it('returns no next at the end of the collection and no previous at the start', () => {
    loadHadithDevFixtures(executor);
    expect(getHadithReaderData(executor, FIXTURE_MULTI.slug, '6')?.next).toBeNull();
    expect(getHadithReaderData(executor, FIXTURE_MULTI.slug, '1')?.previous).toBeNull();
  });

  it('skips a book with no hadith when moving between books', () => {
    loadHadithDevFixtures(executor);
    executor.run(
      `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count)
       VALUES (-1, 9, '9', NULL, NULL, 2, 0)`,
    );
    // Book 9 (no hadith) takes position 2; the fixture's books 2 and 3 move down to positions 3 and 4.
    executor.run('UPDATE hadith_books SET position = position + 1 WHERE resource_id = -1 AND id IN (2, 3)');
    const neighbours = getHadithNeighbours(executor, FIXTURE_MULTI.slug, 2);
    expect(neighbours.next?.hadithNumber).toBe('3');
    expect(neighbours.previous?.hadithNumber).toBe('1');
    expect(getHadithNeighbours(executor, FIXTURE_MULTI.slug, 3).previous?.hadithNumber).toBe('2');
  });

  it('gives an uninstalled entry the canonical slug from its manifest key', () => {
    loadHadithDevFixtures(executor);
    const insert = (resourceId: number, sourceKey: string | null) =>
      executor.run(
        `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default, source_key)
         VALUES (?, 'hadith_collections', 'Uninstalled', NULL, 2, 2048, 0, ?)`,
        [resourceId, sourceKey],
      );
    insert(90, 'muslim');
    insert(91, '');
    insert(92, 'unknown-slug');
    insert(93, null);
    const slugs = Object.fromEntries(listHadithCatalog(executor).map((entry) => [entry.resourceId, entry.slug]));
    expect(slugs[90]).toBe('muslim');
    expect(slugs[91]).toBeNull();
    expect(slugs[92]).toBeNull();
    expect(slugs[93]).toBeNull();
  });

  it('lists the catalogue with install state and slug', () => {
    loadHadithDevFixtures(executor);
    executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
       VALUES (90, 'hadith_collections', 'Uninstalled', NULL, 2, 2048, 0)`,
    );
    executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
       VALUES (91, 'tafsirs', 'Other group', NULL, 1, 1, 0)`,
    );
    const catalog = listHadithCatalog(executor);
    expect(catalog.map((entry) => entry.resourceId)).toEqual([-2, -1, 90]);
    const uninstalled = catalog.find((entry) => entry.resourceId === 90);
    expect(uninstalled).toMatchObject({ installed: false, slug: null, packSizeBytes: 2048 });
    expect(catalog.find((entry) => entry.resourceId === -1)).toMatchObject({ installed: true, slug: FIXTURE_MULTI.slug });
  });
});
