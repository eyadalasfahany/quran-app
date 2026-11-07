import { FIXTURE_MULTI, FIXTURE_SINGLE } from '../data/__fixtures__/dev-fixtures';
import { listBooks } from '../data';
import { at } from '../../../../jest/azkar-test-db';
import { openContentDb } from '@/core/db/content/open';
import {
  addHadithBookmark,
  isHadithBookmarked,
  listHadithBookmarks,
  removeHadithBookmark,
  toggleHadithBookmark,
} from './bookmarks-repository';
import { addAlias, addEntry, fixedNow, mergeResolver, openPersonalDbs, type PersonalDbs } from './__fixtures__/personal-test-db';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));

const slug = FIXTURE_MULTI.slug;

function bookIdOf(dbs: PersonalDbs, bookNumber: string): number {
  return at(
    listBooks(dbs.content, slug).filter((book) => book.bookNumber === bookNumber),
    0,
  ).id;
}

describe('hadith bookmarks repository', () => {
  let dbs: PersonalDbs;

  beforeEach(() => {
    dbs = openPersonalDbs();
    jest.mocked(openContentDb).mockReset();
  });

  afterEach(() => {
    dbs.close();
  });

  const store = (now = 1000) => ({ db: dbs.user, content: dbs.content, now: fixedNow(now) });

  it('adds a bookmark by slug and number and lists it', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store());

    expect(listHadithBookmarks(slug, { db: dbs.user })).toEqual([
      { collectionSlug: slug, hadithNumber: '1', bookNumber: '1', unverified: false, createdAt: 1000 },
    ]);
  });

  it('stores the slug, the number as text and the book number, and no id', () => {
    addHadithBookmark({ slug, hadithNumber: '3.1', bookNumber: '2' }, store());

    const rows = dbs.user.all<Record<string, unknown>>('SELECT * FROM hadith_bookmarks');
    expect(rows).toHaveLength(1);
    expect(Object.keys(at(rows, 0))).toEqual([
      'collection_slug',
      'hadith_number',
      'book_number',
      'unverified',
      'alias_version',
      'created_at',
    ]);
    expect(at(rows, 0)).toMatchObject({ collection_slug: slug, hadith_number: '3.1', book_number: '2' });
  });

  it('saving the same hadith twice keeps one row and the first created_at', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store(1));
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store(2));

    const rows = listHadithBookmarks(slug, { db: dbs.user });
    expect(rows).toHaveLength(1);
    expect(at(rows, 0).createdAt).toBe(1);
  });

  it('removes a bookmark', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store());
    removeHadithBookmark(slug, '1', store());

    expect(isHadithBookmarked(slug, '1', store())).toBe(false);
    expect(listHadithBookmarks(undefined, { db: dbs.user })).toEqual([]);
  });

  it('toggle adds then removes and returns the new state', () => {
    expect(toggleHadithBookmark({ slug, hadithNumber: '2', bookNumber: '1' }, store())).toBe(true);
    expect(isHadithBookmarked(slug, '2', store())).toBe(true);
    expect(toggleHadithBookmark({ slug, hadithNumber: '2', bookNumber: '1' }, store())).toBe(false);
    expect(isHadithBookmarked(slug, '2', store())).toBe(false);
  });

  it('lists newest first and can filter by collection', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store(1));
    addHadithBookmark({ slug: FIXTURE_SINGLE.slug, hadithNumber: '2', bookNumber: '1' }, store(3));
    addHadithBookmark({ slug, hadithNumber: '3', bookNumber: '2' }, store(2));

    expect(listHadithBookmarks(undefined, { db: dbs.user }).map((row) => row.hadithNumber)).toEqual(['2', '3', '1']);
    expect(listHadithBookmarks(slug, { db: dbs.user }).map((row) => row.hadithNumber)).toEqual(['3', '1']);
  });

  it('keeps bookmarks of two collections apart', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store());
    addHadithBookmark({ slug: FIXTURE_SINGLE.slug, hadithNumber: '1', bookNumber: '1' }, store());

    removeHadithBookmark(slug, '1', store());

    expect(listHadithBookmarks(undefined, { db: dbs.user }).map((row) => row.collectionSlug)).toEqual([
      FIXTURE_SINGLE.slug,
    ]);
  });

  it('writes nothing to the outbox', () => {
    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store());
    toggleHadithBookmark({ slug, hadithNumber: '2', bookNumber: '1' }, store());
    removeHadithBookmark(slug, '1', store());

    expect(dbs.user.get<{ c: number }>('SELECT count(*) AS c FROM outbox')).toEqual({ c: 0 });
  });

  it('rejects an empty slug, number or book number', () => {
    const message = 'A saved hadith needs a slug, a number and a book number.';
    expect(() => addHadithBookmark({ slug: '', hadithNumber: '1', bookNumber: '1' }, store())).toThrow(message);
    expect(() => addHadithBookmark({ slug, hadithNumber: '', bookNumber: '1' }, store())).toThrow(message);
    expect(() => addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '' }, store())).toThrow(message);
  });

  it('stores the covering number when a bookmark is made on a merged number', () => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookIdOf(dbs, '2'), hadithNumber: '5709', position: 90 });

    addHadithBookmark(
      { slug, hadithNumber: '5710', bookNumber: '2' },
      { ...store(), resolver: mergeResolver({ '5710': '5709' }) },
    );

    expect(listHadithBookmarks(slug, { db: dbs.user }).map((row) => row.hadithNumber)).toEqual(['5709']);
  });

  it('reports a merged number as bookmarked once its covering hadith is saved', () => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookIdOf(dbs, '2'), hadithNumber: '5709', position: 90 });
    const resolver = mergeResolver({ '5710': '5709' });

    addHadithBookmark({ slug, hadithNumber: '5709', bookNumber: '2' }, { ...store(), resolver });

    expect(isHadithBookmarked(slug, '5710', { ...store(), resolver })).toBe(true);
  });

  it('removes a row stored under a merged number', () => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookIdOf(dbs, '2'), hadithNumber: '5709', position: 90 });
    const resolver = mergeResolver({ '5710': '5709' });
    dbs.user.run(
      `INSERT INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at)
       VALUES (?, '5710', '2', 0, 0, 1)`,
      [slug],
    );

    removeHadithBookmark(slug, '5710', { ...store(), resolver });

    expect(listHadithBookmarks(slug, { db: dbs.user })).toEqual([]);
  });

  it('stamps a new bookmark with the current alias version', () => {
    addAlias(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, oldNumber: '900', newNumber: '901', match: 'exact_text', sinceVersion: 3 });

    addHadithBookmark({ slug, hadithNumber: '1', bookNumber: '1' }, store());

    expect(dbs.user.get<{ alias_version: number }>('SELECT alias_version FROM hadith_bookmarks')).toEqual({
      alias_version: 3,
    });
  });

  it('works with no content database', () => {
    jest.mocked(openContentDb).mockImplementation(() => {
      throw new Error('content.db is not open in this test');
    });

    addHadithBookmark({ slug, hadithNumber: '3.1', bookNumber: '2' }, { db: dbs.user, now: fixedNow(7) });

    expect(listHadithBookmarks(slug, { db: dbs.user })).toEqual([
      { collectionSlug: slug, hadithNumber: '3.1', bookNumber: '2', unverified: false, createdAt: 7 },
    ]);
  });
});
