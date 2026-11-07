import type { SqlExecutor } from '@/core/db/sql-executor';

import type {
  HadithBook,
  HadithCatalogEntry,
  HadithChapter,
  HadithCollection,
  HadithCollectionRef,
  HadithDetail,
  HadithListItem,
  HadithReaderData,
  HadithRef,
} from '../types';
import { hadithCollectionNumber, HADITH_COLLECTION_SLUGS } from './collection-order';
import { hadithResourceId } from './active-resource';

/** Read-only queries over the installed hadith packs. Text columns are selected as stored (no trim, no substr). */

type Page = { limit: number; offset: number };

type CollectionRow = Omit<HadithCollection, 'number'>;

const COLLECTION_SELECT = `
  SELECT c.resource_id AS resourceId, c.id, c.slug,
         c.title_ar AS titleAr, c.title_en AS titleEn, c.author_ar AS authorAr, c.author_en AS authorEn,
         c.attribution_ar AS attributionAr, c.attribution_en AS attributionEn, c.source_url AS sourceUrl,
         c.total_hadith AS totalHadith, c.books_count AS booksCount,
         (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(b.id) END
            FROM hadith_books b WHERE b.resource_id = c.resource_id AND b.hadith_count > 0) AS soleBookId
  FROM hadith_collections c
  JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections'
`;

const BOOK_SELECT = `
  SELECT b.resource_id AS resourceId, b.id, b.book_number AS bookNumber,
         b.title_ar AS titleAr, b.title_en AS titleEn, b.position, b.hadith_count AS hadithCount,
         (SELECT COUNT(*) FROM hadith_chapters ch WHERE ch.resource_id = b.resource_id AND ch.book_id = b.id) AS chapterCount
  FROM hadith_books b
  WHERE b.resource_id = ?
`;

const ITEM_SELECT = `
  SELECT e.resource_id AS resourceId, e.id, e.book_id AS bookId, e.chapter_id AS chapterId,
         e.hadith_number AS hadithNumber, e.arabic_number AS arabicNumber, e.position, e.text_ar AS textAr
  FROM hadith_entries e
`;

type BookRow = Omit<HadithBook, 'collectionSlug' | 'hasChapters'> & { chapterCount: number };

/** Collection numbers for the installed collections (unknown slugs follow the fixed ten, in resource-id order). */
function numbered(rows: readonly CollectionRow[]): HadithCollection[] {
  let unknownNumber = HADITH_COLLECTION_SLUGS.length;
  const withNumbers = rows.map((row) => {
    const known = hadithCollectionNumber(row.slug);
    if (known !== undefined) {
      return { ...row, number: known };
    }
    unknownNumber += 1;
    return { ...row, number: unknownNumber };
  });
  return withNumbers.sort((left, right) => left.number - right.number);
}

function collectionRef(collection: HadithCollection): HadithCollectionRef {
  return {
    slug: collection.slug,
    number: collection.number,
    titleAr: collection.titleAr,
    titleEn: collection.titleEn,
    attributionAr: collection.attributionAr,
    attributionEn: collection.attributionEn,
  };
}

function toBook(row: BookRow, slug: string): HadithBook {
  return {
    resourceId: row.resourceId,
    id: row.id,
    collectionSlug: slug,
    bookNumber: row.bookNumber,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    position: row.position,
    hadithCount: row.hadithCount,
    chapterCount: row.chapterCount,
    hasChapters: row.chapterCount > 0,
  };
}

export function hasHadithContent(db: SqlExecutor): boolean {
  try {
    const row = db.get<{ one: number }>(
      `SELECT 1 AS one FROM hadith_collections c
       JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections'
       LIMIT 1`,
    );
    return row !== undefined;
  } catch {
    return false;
  }
}

export function listInstalledCollections(db: SqlExecutor): HadithCollection[] {
  const rows = db.all<CollectionRow>(`${COLLECTION_SELECT} ORDER BY c.resource_id`);
  return numbered(rows);
}

export function getCollection(db: SqlExecutor, slug: string): HadithCollection | undefined {
  // The number of an unknown slug depends on the other installed collections, so the full list is read and searched.
  return listInstalledCollections(db).find((collection) => collection.slug === slug);
}

export function listBooks(db: SqlExecutor, slug: string): HadithBook[] {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return [];
  }
  return db
    .all<BookRow>(`${BOOK_SELECT} ORDER BY b.position, b.id`, [resourceId])
    .map((row) => toBook(row, slug));
}

export function getBook(db: SqlExecutor, slug: string, bookId: number): HadithBook | undefined {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return undefined;
  }
  const row = db.get<BookRow>(`${BOOK_SELECT} AND b.id = ? LIMIT 1`, [resourceId, bookId]);
  return row === undefined ? undefined : toBook(row, slug);
}

export function listChapters(db: SqlExecutor, slug: string, bookId: number): HadithChapter[] {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return [];
  }
  return db.all<HadithChapter>(
    `SELECT resource_id AS resourceId, id, book_id AS bookId, chapter_number AS chapterNumber,
            title_ar AS titleAr, title_en AS titleEn, position, hadith_count AS hadithCount
     FROM hadith_chapters
     WHERE resource_id = ? AND book_id = ?
     ORDER BY position, id`,
    [resourceId, bookId],
  );
}

export function listBookHadith(db: SqlExecutor, slug: string, bookId: number, page?: Page): HadithListItem[] {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return [];
  }
  const params: (number | string)[] = [resourceId, bookId];
  let sql = `${ITEM_SELECT} WHERE e.resource_id = ? AND e.book_id = ? ORDER BY e.position, e.id`;
  if (page !== undefined) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(page.limit, page.offset);
  }
  return db.all<HadithListItem>(sql, params);
}

export function listChapterHadith(db: SqlExecutor, slug: string, chapterId: number, page?: Page): HadithListItem[] {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return [];
  }
  const params: (number | string)[] = [resourceId, chapterId];
  let sql = `${ITEM_SELECT} WHERE e.resource_id = ? AND e.chapter_id = ? ORDER BY e.position, e.id`;
  if (page !== undefined) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(page.limit, page.offset);
  }
  return db.all<HadithListItem>(sql, params);
}

type DetailRow = HadithListItem & {
  collectionSlug: string;
  bookNumber: string;
  bookTitleAr: string | null;
  bookTitleEn: string | null;
  bookPosition: number;
  chapterNumber: number | null;
  chapterTitleAr: string | null;
  chapterTitleEn: string | null;
  sourceUrl: string | null;
};

/**
 * One hadith by slug and number. When two rows share the number, the lower id wins (Open question 5). The result has
 * exactly the keys of `HadithDetail`: no grade, no English text, no search column.
 */
export function getHadith(db: SqlExecutor, slug: string, hadithNumber: string): HadithDetail | undefined {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return undefined;
  }
  const row = db.get<DetailRow>(
    `SELECT e.resource_id AS resourceId, e.id, e.book_id AS bookId, e.chapter_id AS chapterId,
            e.hadith_number AS hadithNumber, e.arabic_number AS arabicNumber, e.position, e.text_ar AS textAr,
            c.slug AS collectionSlug,
            b.book_number AS bookNumber, b.title_ar AS bookTitleAr, b.title_en AS bookTitleEn, b.position AS bookPosition,
            ch.chapter_number AS chapterNumber, ch.title_ar AS chapterTitleAr, ch.title_en AS chapterTitleEn,
            e.source_url AS sourceUrl
     FROM hadith_entries e
     JOIN hadith_collections c ON c.resource_id = e.resource_id
     JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
     LEFT JOIN hadith_chapters ch ON ch.resource_id = e.resource_id AND ch.id = e.chapter_id
     WHERE e.resource_id = ? AND e.hadith_number = ?
     ORDER BY e.id
     LIMIT 1`,
    [resourceId, hadithNumber],
  );
  if (row === undefined) {
    return undefined;
  }
  return toDetail(db, row);
}

function toDetail(db: SqlExecutor, row: DetailRow): HadithDetail {
  const collection = getCollection(db, row.collectionSlug);
  if (collection === undefined) {
    throw new Error('Hadith row without its collection.');
  }
  const chapter =
    row.chapterId === null || row.chapterNumber === null
      ? null
      : {
          id: row.chapterId,
          chapterNumber: row.chapterNumber,
          titleAr: row.chapterTitleAr,
          titleEn: row.chapterTitleEn,
        };
  return {
    resourceId: row.resourceId,
    id: row.id,
    bookId: row.bookId,
    chapterId: row.chapterId,
    hadithNumber: row.hadithNumber,
    arabicNumber: row.arabicNumber,
    position: row.position,
    textAr: row.textAr,
    collection: collectionRef(collection),
    book: {
      id: row.bookId,
      bookNumber: row.bookNumber,
      titleAr: row.bookTitleAr,
      titleEn: row.bookTitleEn,
      position: row.bookPosition,
    },
    chapter,
    sourceUrl: row.sourceUrl,
  };
}

type Position = { bookPosition: number; entryPosition: number };

/** Previous and next hadith in reading order: books by position, then entries by position inside a book. */
export function getHadithNeighbours(
  db: SqlExecutor,
  slug: string,
  hadithId: number,
): { previous: HadithRef | null; next: HadithRef | null } {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return { previous: null, next: null };
  }
  const current = db.get<Position>(
    `SELECT b.position AS bookPosition, e.position AS entryPosition
     FROM hadith_entries e
     JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
     WHERE e.resource_id = ? AND e.id = ?
     LIMIT 1`,
    [resourceId, hadithId],
  );
  if (current === undefined) {
    return { previous: null, next: null };
  }

  const neighbour = (direction: 'next' | 'previous'): HadithRef | null => {
    const comparison = direction === 'next' ? '>' : '<';
    const order = direction === 'next' ? 'ASC' : 'DESC';
    const row = db.get<HadithRef>(
      `SELECT e.hadith_number AS hadithNumber, e.book_id AS bookId, e.chapter_id AS chapterId
       FROM hadith_entries e
       JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
       WHERE e.resource_id = ?
         AND (b.position ${comparison} ? OR (b.position = ? AND e.position ${comparison} ?))
       ORDER BY b.position ${order}, e.position ${order}
       LIMIT 1`,
      [resourceId, current.bookPosition, current.bookPosition, current.entryPosition],
    );
    return row ?? null;
  };

  return { previous: neighbour('previous'), next: neighbour('next') };
}

export function getHadithReaderData(db: SqlExecutor, slug: string, hadithNumber: string): HadithReaderData | undefined {
  const hadith = getHadith(db, slug, hadithNumber);
  if (hadith === undefined) {
    return undefined;
  }
  const { previous, next } = getHadithNeighbours(db, slug, hadith.id);
  return { hadith, previous, next };
}

type CatalogRow = {
  resourceId: number;
  name: string | null;
  nameAr: string | null;
  version: number;
  packSizeBytes: number;
  installedFlag: number;
  slug: string | null;
  sourceKey: string | null;
};

export function listHadithCatalog(db: SqlExecutor): HadithCatalogEntry[] {
  const rows = db.all<CatalogRow>(
    `SELECT cr.resource_id AS resourceId, cr.name AS name, cr.name_ar AS nameAr, cr.version AS version,
            cr.pack_size_bytes AS packSizeBytes,
            CASE WHEN ir.resource_id IS NULL THEN 0 ELSE 1 END AS installedFlag,
            CASE WHEN ir.resource_id IS NULL THEN NULL ELSE c.slug END AS slug,
            cr.source_key AS sourceKey
     FROM catalog_resources cr
     LEFT JOIN installed_resources ir ON ir.resource_id = cr.resource_id AND ir."group" = 'hadith_collections'
     LEFT JOIN hadith_collections c ON c.resource_id = cr.resource_id
     WHERE cr."group" = 'hadith_collections'
     ORDER BY cr.resource_id`,
  );
  return rows.map((row) => ({
    resourceId: row.resourceId,
    name: row.name,
    nameAr: row.nameAr,
    version: row.version,
    packSizeBytes: row.packSizeBytes,
    installed: row.installedFlag === 1,
    // Installed entries read their slug from the collection row. Uninstalled entries keep the manifest key when it is
    // a canonical slug; anything else is null.
    slug: row.installedFlag === 1 ? row.slug : canonicalSlug(row.sourceKey),
  }));
}

function canonicalSlug(value: string | null): string | null {
  return value !== null && HADITH_COLLECTION_SLUGS.includes(value) ? value : null;
}
