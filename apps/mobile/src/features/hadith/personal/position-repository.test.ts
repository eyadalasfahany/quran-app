import { storage, storageKeys } from '@/core/storage/mmkv';
import { FIXTURE_MULTI, FIXTURE_SINGLE } from '../data/__fixtures__/dev-fixtures';
import { listBooks } from '../data';
import { at } from '../../../../jest/azkar-test-db';
import {
  clearHadithReadingPlace,
  getHadithReadingPlace,
  listHadithReadingPlaces,
  saveHadithReadingPlace,
} from './position-repository';
import { addEntry, fixedNow, mergeResolver, openPersonalDbs, type PersonalDbs } from './__fixtures__/personal-test-db';
import type { HadithNumberResolver } from './model';

const slug = FIXTURE_MULTI.slug;

describe('hadith reading place repository', () => {
  let dbs: PersonalDbs;

  beforeEach(() => {
    dbs = openPersonalDbs();
  });

  afterEach(() => {
    dbs.close();
    storage.remove(storageKeys.readerLastVerseKey);
    storage.remove(storageKeys.readerLastPage);
  });

  const store = (now = 1000, resolver?: HadithNumberResolver) => ({
    db: dbs.user,
    content: dbs.content,
    now: fixedNow(now),
    resolver,
  });

  it('has no place before anything is read', () => {
    expect(getHadithReadingPlace(slug, { db: dbs.user })).toBeUndefined();
    expect(listHadithReadingPlaces({ db: dbs.user })).toEqual([]);
  });

  it('saves one place per collection and replaces the previous one', () => {
    saveHadithReadingPlace({ slug, hadithNumber: '1', bookNumber: '1' }, store(1));
    saveHadithReadingPlace({ slug, hadithNumber: '2', bookNumber: '2' }, store(2));

    expect(getHadithReadingPlace(slug, { db: dbs.user })).toEqual({
      collectionSlug: slug,
      hadithNumber: '2',
      bookNumber: '2',
      unverified: false,
      updatedAt: 2,
    });
    expect(dbs.user.get<{ c: number }>('SELECT count(*) AS c FROM hadith_reading_position')).toEqual({ c: 1 });
  });

  it('keeps two collections apart', () => {
    saveHadithReadingPlace({ slug, hadithNumber: '1', bookNumber: '1' }, store(1));
    saveHadithReadingPlace({ slug: FIXTURE_SINGLE.slug, hadithNumber: '2', bookNumber: '1' }, store(2));

    expect(getHadithReadingPlace(slug, { db: dbs.user })?.hadithNumber).toBe('1');
    expect(getHadithReadingPlace(FIXTURE_SINGLE.slug, { db: dbs.user })?.hadithNumber).toBe('2');
    expect(listHadithReadingPlaces({ db: dbs.user })).toHaveLength(2);
  });

  it('lists places newest first', () => {
    saveHadithReadingPlace({ slug, hadithNumber: '1', bookNumber: '1' }, store(1));
    saveHadithReadingPlace({ slug: FIXTURE_SINGLE.slug, hadithNumber: '2', bookNumber: '1' }, store(5));

    expect(listHadithReadingPlaces({ db: dbs.user }).map((place) => place.collectionSlug)).toEqual([
      FIXTURE_SINGLE.slug,
      slug,
    ]);
  });

  it('always saves a verified place', () => {
    dbs.user.run(
      `INSERT INTO hadith_reading_position (collection_slug, hadith_number, book_number, unverified, alias_version, updated_at)
       VALUES (?, '1', '1', 1, 0, 1)`,
      [slug],
    );

    saveHadithReadingPlace({ slug, hadithNumber: '2', bookNumber: '2' }, store(2));

    expect(getHadithReadingPlace(slug, { db: dbs.user })?.unverified).toBe(false);
  });

  it('stores the covering number for a merged number', () => {
    const bookTwo = at(
      listBooks(dbs.content, slug).filter((book) => book.bookNumber === '2'),
      0,
    );
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: bookTwo.id, hadithNumber: '5709', position: 90 });

    saveHadithReadingPlace(
      { slug, hadithNumber: '5710', bookNumber: '2' },
      store(3, mergeResolver({ '5710': '5709' })),
    );

    expect(getHadithReadingPlace(slug, { db: dbs.user })?.hadithNumber).toBe('5709');
  });

  it('does not touch the Quran reading_position table', () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    storage.set(storageKeys.readerLastPage, 42);

    saveHadithReadingPlace({ slug, hadithNumber: '1', bookNumber: '1' }, store());
    saveHadithReadingPlace({ slug: FIXTURE_SINGLE.slug, hadithNumber: '2', bookNumber: '1' }, store());

    // The Quran table is not created in user.db at all; its keys in MMKV are read back unchanged.
    expect(dbs.user.get('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'reading_position'])).toBeUndefined();
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');
    expect(storage.getNumber(storageKeys.readerLastPage)).toBe(42);
  });

  it('clears one collection', () => {
    saveHadithReadingPlace({ slug, hadithNumber: '1', bookNumber: '1' }, store());
    saveHadithReadingPlace({ slug: FIXTURE_SINGLE.slug, hadithNumber: '2', bookNumber: '1' }, store());

    clearHadithReadingPlace(slug, { db: dbs.user });

    expect(getHadithReadingPlace(slug, { db: dbs.user })).toBeUndefined();
    expect(getHadithReadingPlace(FIXTURE_SINGLE.slug, { db: dbs.user })).toBeDefined();
  });
});
