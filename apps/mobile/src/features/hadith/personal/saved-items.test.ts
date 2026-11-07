import { FIXTURE_MULTI } from '../data/__fixtures__/dev-fixtures';
import { listBooks } from '../data';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { at } from '../../../../jest/azkar-test-db';
import { addHadithBookmark } from './bookmarks-repository';
import { addEntry, fixedNow, mergeResolver, openPersonalDbs, PLACEHOLDER_TEXT_AR, type PersonalDbs } from './__fixtures__/personal-test-db';
import { listSavedHadithItems } from './saved-items';

const slug = FIXTURE_MULTI.slug;

describe('listSavedHadithItems', () => {
  let dbs: PersonalDbs;

  beforeEach(() => {
    dbs = openPersonalDbs();
  });

  afterEach(() => {
    dbs.close();
  });

  const bookId = (bookNumber: string): number =>
    at(
      listBooks(dbs.content, slug).filter((book) => book.bookNumber === bookNumber),
      0,
    ).id;

  /** Fixture hadith 5709 and 5711 in book 2; the covering number 5709 is what a merged 5710 opens. */
  const addMergedFixture = (): void => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookId('2'), hadithNumber: '5709', position: 90 });
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9002, bookId: bookId('2'), hadithNumber: '5711', position: 91 });
  };

  const insertRow = (hadithNumber: string, bookNumber: string, unverified = 0, createdAt = 1): void => {
    dbs.user.run(
      `INSERT INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [slug, hadithNumber, bookNumber, unverified, createdAt],
    );
  };

  it('returns the saved hadith with its collection, book and confirmed hadith', () => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookId('1'), hadithNumber: '5709', position: 90 });
    addHadithBookmark({ slug, hadithNumber: '5709', bookNumber: '1' }, { db: dbs.user, content: dbs.content, now: fixedNow(1) });

    const items = listSavedHadithItems({ db: dbs.user, content: dbs.content });

    expect(items).toHaveLength(1);
    const item = at(items, 0);
    expect(item.collection).toMatchObject({ slug });
    expect(item.book).toMatchObject({ bookNumber: '1' });
    expect(item.hadith?.hadithNumber).toBe('5709');
    expect(item.openNumber).toBe('5709');
  });

  it('opens the covering hadith for a bookmark stored on a merged number', () => {
    addMergedFixture();
    insertRow('5710', '2');

    const items = listSavedHadithItems({
      db: dbs.user,
      content: dbs.content,
      resolver: mergeResolver({ '5710': '5709' }),
    });

    expect(items).toHaveLength(1);
    const item = at(items, 0);
    expect(item.saved.hadithNumber).toBe('5710');
    expect(item.openNumber).toBe('5709');
    expect(item.hadith?.hadithNumber).toBe('5709');
    expect(item.hadith?.textAr).toBe(PLACEHOLDER_TEXT_AR);
  });

  it('opens the covering hadith for a bookmark made on a merged number', () => {
    addMergedFixture();
    const resolver = mergeResolver({ '5710': '5709' });

    addHadithBookmark({ slug, hadithNumber: '5710', bookNumber: '2' }, { db: dbs.user, content: dbs.content, resolver, now: fixedNow(1) });

    const items = listSavedHadithItems({ db: dbs.user, content: dbs.content, resolver });
    expect(at(items, 0).saved.hadithNumber).toBe('5709');
    expect(at(items, 0).openNumber).toBe('5709');
    expect(at(items, 0).hadith?.hadithNumber).toBe('5709');
  });

  it('leaves a number that matches nothing as a missing hadith', () => {
    insertRow('999', '1');

    const item = at(listSavedHadithItems({ db: dbs.user, content: dbs.content }), 0);

    expect(item.hadith).toBeNull();
    expect(item.openNumber).toBeNull();
    expect(item.collection).toMatchObject({ slug });
    expect(item.book).toMatchObject({ bookNumber: '1' });
  });

  it('returns collection and book null when the collection is not installed', () => {
    dbs.user.run(
      `INSERT INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at)
       VALUES ('not-installed', '1', '1', 0, 0, 1)`,
    );

    const item = at(listSavedHadithItems({ db: dbs.user, content: dbs.content }), 0);

    expect(item.collection).toBeNull();
    expect(item.book).toBeNull();
    expect(item.hadith).toBeNull();
    expect(item.openNumber).toBeNull();
  });

  it('returns no hadith and no number for an unverified item', () => {
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookId('2'), hadithNumber: '5709', position: 90 });
    insertRow('5709', '2', 1);

    const item = at(listSavedHadithItems({ db: dbs.user, content: dbs.content }), 0);

    expect(item.hadith).toBeNull();
    expect(item.openNumber).toBeNull();
  });

  it('uses the book number as the fallback place', () => {
    insertRow('5709', '3', 1);

    const item = at(listSavedHadithItems({ db: dbs.user, content: dbs.content }), 0);

    expect(item.saved.unverified).toBe(true);
    expect(item.book).toMatchObject({ bookNumber: '3' });
  });

  it('does not throw when content reads fail', () => {
    insertRow('1', '1');
    const broken: SqlExecutor = {
      exec: () => {
        throw new Error('content read failed');
      },
      run: () => {
        throw new Error('content read failed');
      },
      get: () => {
        throw new Error('content read failed');
      },
      all: () => {
        throw new Error('content read failed');
      },
      transaction: () => {
        throw new Error('content read failed');
      },
    };

    const items = listSavedHadithItems({ db: dbs.user, content: broken });

    expect(items).toHaveLength(1);
    expect(at(items, 0)).toMatchObject({ collection: null, book: null, hadith: null, openNumber: null });
  });
});
