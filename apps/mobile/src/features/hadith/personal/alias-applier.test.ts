import { FIXTURE_MULTI, FIXTURE_SINGLE } from '../data/__fixtures__/dev-fixtures';
import { listBooks } from '../data';
import { at } from '../../../../jest/azkar-test-db';
import { addHadithBookmark } from './bookmarks-repository';
import { applyHadithAliases, currentAliasVersion } from './alias-applier';
import { saveHadithReadingPlace } from './position-repository';
import { addAlias, addEntry, fixedNow, openPersonalDbs, type PersonalDbs } from './__fixtures__/personal-test-db';

const slug = FIXTURE_MULTI.slug;
const resourceId = FIXTURE_MULTI.resourceId;

type BookmarkSnapshot = Record<string, unknown>[];

describe('applyHadithAliases', () => {
  let dbs: PersonalDbs;

  beforeEach(() => {
    dbs = openPersonalDbs();
  });

  afterEach(() => {
    dbs.close();
  });

  const insertBookmark = (hadithNumber: string, bookNumber = '1', unverified = 0, createdAt = 1, collection: string = slug): void => {
    dbs.user.run(
      `INSERT INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [collection, hadithNumber, bookNumber, unverified, createdAt],
    );
  };

  const bookmarks = (): BookmarkSnapshot => dbs.user.all('SELECT * FROM hadith_bookmarks ORDER BY collection_slug, hadith_number');
  const places = (): BookmarkSnapshot => dbs.user.all('SELECT * FROM hadith_reading_position ORDER BY collection_slug');
  const row = (hadithNumber: string): Record<string, unknown> =>
    at(
      bookmarks().filter((item) => item.hadith_number === hadithNumber),
      0,
    );

  /** A place saved before the aliases arrive (alias_version 0), as the applier sees a real one. */
  const insertPlace = (hadithNumber: string, bookNumber = '1'): void => {
    dbs.user.run(
      `INSERT INTO hadith_reading_position (collection_slug, hadith_number, book_number, unverified, alias_version, updated_at)
       VALUES (?, ?, ?, 0, 0, 1)`,
      [slug, hadithNumber, bookNumber],
    );
  };

  const bookIdOf = (bookNumber: string): number =>
    at(
      listBooks(dbs.content, slug).filter((book) => book.bookNumber === bookNumber),
      0,
    ).id;

  it('does nothing while the pack has no aliases', () => {
    insertBookmark('1');
    saveHadithReadingPlace({ slug, hadithNumber: '2', bookNumber: '2' }, { db: dbs.user, content: dbs.content, now: fixedNow(1) });
    const before = [bookmarks(), places()];

    const result = applyHadithAliases(dbs.user, dbs.content);

    expect(result).toEqual({ rewritten: 0, unverified: 0, unchanged: 2 });
    expect([bookmarks(), places()]).toEqual(before);
  });

  it('rewrites an exact_text alias silently', () => {
    addEntry(dbs.content, { resourceId, id: 9001, bookId: bookIdOf('2'), hadithNumber: '5709', position: 90 });
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '5709', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100');
    insertPlace('100');

    const result = applyHadithAliases(dbs.user, dbs.content);

    expect(result).toEqual({ rewritten: 2, unverified: 0, unchanged: 0 });
    expect(row('5709')).toMatchObject({ unverified: 0, alias_version: 1 });
    expect(places()).toEqual([expect.objectContaining({ hadith_number: '5709', unverified: 0, alias_version: 1 })]);
  });

  it('takes the new book number from the new hadith', () => {
    addEntry(dbs.content, { resourceId, id: 9001, bookId: bookIdOf('2'), hadithNumber: '5709', position: 90 });
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '5709', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100', '1');

    applyHadithAliases(dbs.user, dbs.content);

    expect(row('5709')).toMatchObject({ book_number: '2' });
  });

  it('marks similar_text, number_only and none as unverified and keeps the number and book', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '201', newNumber: '202', match: 'similar_text', sinceVersion: 1 });
    addAlias(dbs.content, { resourceId, oldNumber: '202', newNumber: '203', match: 'number_only', sinceVersion: 1 });
    addAlias(dbs.content, { resourceId, oldNumber: '203', newNumber: null, match: 'none', sinceVersion: 1 });
    insertBookmark('201', '1');
    insertBookmark('202', '1');
    insertBookmark('203', '1');

    const result = applyHadithAliases(dbs.user, dbs.content);

    expect(result).toEqual({ rewritten: 0, unverified: 3, unchanged: 0 });
    for (const number of ['201', '202', '203']) {
      expect(row(number)).toMatchObject({ hadith_number: number, book_number: '1', unverified: 1, alias_version: 1 });
    }
  });

  it('marks an exact_text alias with no new number as unverified', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '300', newNumber: null, match: 'exact_text', sinceVersion: 1 });
    insertBookmark('300');

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 0, unverified: 1, unchanged: 0 });
    expect(row('300')).toMatchObject({ unverified: 1 });
  });

  it('leaves an item with no alias unchanged', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '999', newNumber: '998', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('400');

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 0, unverified: 0, unchanged: 1 });
    expect(row('400')).toMatchObject({ hadith_number: '400', alias_version: 0, unverified: 0 });
  });

  it('leaves items of an uninstalled collection untouched and applies later', () => {
    addAlias(dbs.content, { resourceId: FIXTURE_SINGLE.resourceId, oldNumber: '1', newNumber: '2', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('1', '1', 0, 1, FIXTURE_SINGLE.slug);
    dbs.content.run('DELETE FROM installed_resources WHERE resource_id = ?', [FIXTURE_SINGLE.resourceId]);
    const before = bookmarks();

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 0, unverified: 0, unchanged: 1 });
    expect(bookmarks()).toEqual(before);

    dbs.content.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar)
       VALUES (?, 'hadith_collections', 1, 'fixture', 0, NULL, NULL)`,
      [FIXTURE_SINGLE.resourceId],
    );

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 1, unverified: 0, unchanged: 0 });
    expect(dbs.user.get('SELECT hadith_number FROM hadith_bookmarks WHERE collection_slug = ?', [FIXTURE_SINGLE.slug])).toEqual({
      hadith_number: '2',
    });
  });

  it('applying twice changes nothing', () => {
    addEntry(dbs.content, { resourceId, id: 9001, bookId: bookIdOf('2'), hadithNumber: '5709', position: 90 });
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '5709', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100');
    insertPlace('100');

    applyHadithAliases(dbs.user, dbs.content);
    const afterFirst = [bookmarks(), places()];

    const second = applyHadithAliases(dbs.user, dbs.content);

    expect([bookmarks(), places()]).toEqual(afterFirst);
    expect(second).toMatchObject({ rewritten: 0, unverified: 0 });
  });

  it('follows an item through two switches', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '1', newNumber: '2', match: 'exact_text', sinceVersion: 1 });
    addAlias(dbs.content, { resourceId, oldNumber: '2', newNumber: '3', match: 'exact_text', sinceVersion: 2 });
    insertBookmark('1');

    applyHadithAliases(dbs.user, dbs.content);

    expect(row('3')).toMatchObject({ alias_version: 2, unverified: 0 });
  });

  it('does not rewrite an item saved after the aliases arrived', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '101', match: 'exact_text', sinceVersion: 1 });
    addHadithBookmark({ slug, hadithNumber: '100', bookNumber: '1' }, { db: dbs.user, content: dbs.content, now: fixedNow(5) });

    applyHadithAliases(dbs.user, dbs.content);

    expect(row('100')).toMatchObject({ hadith_number: '100', alias_version: 1 });
  });

  it('keeps the existing bookmark when a rewrite would duplicate it', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '101', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100', '1', 0, 1);
    insertBookmark('101', '1', 0, 2);

    const result = applyHadithAliases(dbs.user, dbs.content);

    expect(result).toEqual({ rewritten: 1, unverified: 0, unchanged: 1 });
    expect(bookmarks()).toEqual([expect.objectContaining({ hadith_number: '101', created_at: 2 })]);
  });

  it('never touches an item that is already unverified', () => {
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '101', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100', '1', 1);
    const before = bookmarks();

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 0, unverified: 0, unchanged: 0 });
    expect(bookmarks()).toEqual(before);
  });

  it('stores no database id after a rewrite', () => {
    addEntry(dbs.content, { resourceId, id: 9001, bookId: bookIdOf('2'), hadithNumber: '5709', position: 90 });
    addAlias(dbs.content, { resourceId, oldNumber: '100', newNumber: '5709', match: 'exact_text', sinceVersion: 1 });
    insertBookmark('100');

    applyHadithAliases(dbs.user, dbs.content);

    expect(Object.keys(at(bookmarks(), 0))).toEqual([
      'collection_slug',
      'hadith_number',
      'book_number',
      'unverified',
      'alias_version',
      'created_at',
    ]);
  });

  it('returns zeros when the alias table is missing', () => {
    insertBookmark('1');
    dbs.content.exec('DROP TABLE hadith_ref_aliases');

    expect(applyHadithAliases(dbs.user, dbs.content)).toEqual({ rewritten: 0, unverified: 0, unchanged: 0 });
    expect(currentAliasVersion(dbs.content, slug)).toBe(0);
  });
});
