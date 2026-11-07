import { canonicalHadithNumber } from './covering-number';
import { currentAliasVersion } from './alias-applier';
import type { HadithPersonalStore, HadithPlaceInput, HadithReadingPlace } from './model';
import { resolveHadithStore } from './store';

type PlaceRow = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: number;
  updatedAt: number;
};

const PLACE_COLUMNS = `collection_slug AS collectionSlug, hadith_number AS hadithNumber, book_number AS bookNumber,
  unverified, updated_at AS updatedAt`;

function toPlace(row: PlaceRow): HadithReadingPlace {
  return {
    collectionSlug: row.collectionSlug,
    hadithNumber: row.hadithNumber,
    bookNumber: row.bookNumber,
    unverified: row.unverified === 1,
    updatedAt: row.updatedAt,
  };
}

/** Writes the place, replacing the collection's previous one. Always verified (`unverified` 0). */
export function saveHadithReadingPlace(input: HadithPlaceInput, store?: HadithPersonalStore): void {
  if (input.slug === '' || input.hadithNumber === '' || input.bookNumber === '') {
    throw new Error('A saved hadith needs a slug, a number and a book number.');
  }
  const { db, content, resolver, now } = resolveHadithStore(store);
  const canonical = canonicalHadithNumber(content, input.slug, input.hadithNumber, resolver);
  db.run(
    `INSERT INTO hadith_reading_position (collection_slug, hadith_number, book_number, unverified, alias_version, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(collection_slug) DO UPDATE SET
       hadith_number = excluded.hadith_number,
       book_number = excluded.book_number,
       unverified = 0,
       alias_version = excluded.alias_version,
       updated_at = excluded.updated_at`,
    [input.slug, canonical, input.bookNumber, currentAliasVersion(content, input.slug), now()],
  );
}

export function getHadithReadingPlace(slug: string, store?: HadithPersonalStore): HadithReadingPlace | undefined {
  const { db } = resolveHadithStore(store);
  const row = db.get<PlaceRow>(`SELECT ${PLACE_COLUMNS} FROM hadith_reading_position WHERE collection_slug = ?`, [slug]);
  return row === undefined ? undefined : toPlace(row);
}

/** Newest first. */
export function listHadithReadingPlaces(store?: HadithPersonalStore): HadithReadingPlace[] {
  const { db } = resolveHadithStore(store);
  return db
    .all<PlaceRow>(`SELECT ${PLACE_COLUMNS} FROM hadith_reading_position ORDER BY updated_at DESC, collection_slug ASC`)
    .map(toPlace);
}

export function clearHadithReadingPlace(slug: string, store?: HadithPersonalStore): void {
  const { db } = resolveHadithStore(store);
  db.run('DELETE FROM hadith_reading_position WHERE collection_slug = ?', [slug]);
}
