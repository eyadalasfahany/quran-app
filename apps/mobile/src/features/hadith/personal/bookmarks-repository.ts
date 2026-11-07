import type { SqlExecutor } from '@/core/db/sql-executor';

import { currentAliasVersion } from './alias-applier';
import { canonicalHadithNumber } from './covering-number';
import type { HadithPersonalStore, HadithPlaceInput, SavedHadith } from './model';
import { resolveHadithStore } from './store';

type BookmarkRow = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: number;
  createdAt: number;
};

const SAVED_COLUMNS = `collection_slug AS collectionSlug, hadith_number AS hadithNumber, book_number AS bookNumber,
  unverified, created_at AS createdAt`;

function assertPlace(input: HadithPlaceInput): void {
  if (input.slug === '' || input.hadithNumber === '' || input.bookNumber === '') {
    throw new Error('A saved hadith needs a slug, a number and a book number.');
  }
}

function toSaved(row: BookmarkRow): SavedHadith {
  return {
    collectionSlug: row.collectionSlug,
    hadithNumber: row.hadithNumber,
    bookNumber: row.bookNumber,
    unverified: row.unverified === 1,
    createdAt: row.createdAt,
  };
}

// The helpers below take the executor and never open a transaction, so the public functions can compose them.

function insertBookmark(
  db: SqlExecutor,
  slug: string,
  hadithNumber: string,
  bookNumber: string,
  aliasVersion: number,
  createdAt: number,
): void {
  db.run(
    `INSERT OR IGNORE INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [slug, hadithNumber, bookNumber, aliasVersion, createdAt],
  );
}

function deleteBookmarks(db: SqlExecutor, slug: string, numbers: readonly string[]): void {
  for (const hadithNumber of new Set(numbers)) {
    db.run('DELETE FROM hadith_bookmarks WHERE collection_slug = ? AND hadith_number = ?', [slug, hadithNumber]);
  }
}

function hasBookmark(db: SqlExecutor, slug: string, numbers: readonly string[]): boolean {
  return numbers.some(
    (hadithNumber) =>
      db.get<{ one: number }>(
        'SELECT 1 AS one FROM hadith_bookmarks WHERE collection_slug = ? AND hadith_number = ? LIMIT 1',
        [slug, hadithNumber],
      ) !== undefined,
  );
}

/** Every bookmark, or those of one collection. Newest first. Used by the repository and by the saved list. */
export function readHadithBookmarks(db: SqlExecutor, slug?: string): SavedHadith[] {
  const where = slug === undefined ? '' : 'WHERE collection_slug = ?';
  const params = slug === undefined ? [] : [slug];
  return db
    .all<BookmarkRow>(
      `SELECT ${SAVED_COLUMNS} FROM hadith_bookmarks ${where}
       ORDER BY created_at DESC, collection_slug ASC, hadith_number ASC`,
      params,
    )
    .map(toSaved);
}

export function addHadithBookmark(input: HadithPlaceInput, store?: HadithPersonalStore): void {
  assertPlace(input);
  const { db, content, resolver, now } = resolveHadithStore(store);
  const canonical = canonicalHadithNumber(content, input.slug, input.hadithNumber, resolver);
  insertBookmark(
    db,
    input.slug,
    canonical,
    input.bookNumber,
    currentAliasVersion(content, input.slug),
    now(),
  );
}

/** Removes the bookmark stored under the covering number and under the raw number, so an older row still goes. */
export function removeHadithBookmark(slug: string, hadithNumber: string, store?: HadithPersonalStore): void {
  const { db, content, resolver } = resolveHadithStore(store);
  const canonical = canonicalHadithNumber(content, slug, hadithNumber, resolver);
  db.transaction(() => {
    deleteBookmarks(db, slug, [canonical, hadithNumber]);
  });
}

/** Adds or removes. Returns whether the hadith is saved afterwards. */
export function toggleHadithBookmark(input: HadithPlaceInput, store?: HadithPersonalStore): boolean {
  assertPlace(input);
  const { db, content, resolver, now } = resolveHadithStore(store);

  return db.transaction(() => {
    const canonical = canonicalHadithNumber(content, input.slug, input.hadithNumber, resolver);
    const numbers = [canonical, input.hadithNumber];

    if (hasBookmark(db, input.slug, numbers)) {
      deleteBookmarks(db, input.slug, numbers);
      return false;
    }

    insertBookmark(
      db,
      input.slug,
      canonical,
      input.bookNumber,
      currentAliasVersion(content, input.slug),
      now(),
    );
    return true;
  });
}

export function isHadithBookmarked(slug: string, hadithNumber: string, store?: HadithPersonalStore): boolean {
  const { db, content, resolver } = resolveHadithStore(store);
  const canonical = canonicalHadithNumber(content, slug, hadithNumber, resolver);
  return hasBookmark(db, slug, [canonical, hadithNumber]);
}

/** Newest first. With `slug`, only that collection. */
export function listHadithBookmarks(slug?: string, store?: HadithPersonalStore): SavedHadith[] {
  const { db } = resolveHadithStore(store);
  return readHadithBookmarks(db, slug);
}
