import type { SqlExecutor } from '@/core/db/sql-executor';

import type {
  HadithBook,
  HadithBookOutlineItem,
  HadithCatalogEntry,
  HadithChapter,
  HadithCollection,
  HadithCollectionRef,
  HadithDetail,
  HadithListItem,
  HadithPositionRange,
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
         e.hadith_number AS hadithNumber, e.arabic_number AS arabicNumber, e.position, e.text_ar AS textAr,
         e.number_first AS numberFirst, e.number_last AS numberLast, e.source_code AS sourceCode
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
    `SELECT c.resource_id AS resourceId, c.id, c.book_id AS bookId, c.chapter_number AS chapterNumber,
            c.title_ar AS titleAr, c.title_en AS titleEn, c.position, c.hadith_count AS hadithCount,
            CASE WHEN c.hadith_count = 1 THEN
              (SELECT e.hadith_number FROM hadith_entries e
               WHERE e.resource_id = c.resource_id AND e.chapter_id = c.id ORDER BY e.position, e.id LIMIT 1)
            END AS soleHadithNumber
     FROM hadith_chapters c
     WHERE c.resource_id = ? AND c.book_id = ?
     ORDER BY c.position, c.id`,
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

/** Hadith of a position range inside one book (a run from the outline), in position order, one page at a time. */
export function listBookHadithRange(
  db: SqlExecutor,
  slug: string,
  bookId: number,
  range: HadithPositionRange,
  page?: Page,
): HadithListItem[] {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return [];
  }
  const params: (number | string)[] = [resourceId, bookId, range.from, range.to];
  let sql = `${ITEM_SELECT} WHERE e.resource_id = ? AND e.book_id = ? AND e.position BETWEEN ? AND ? ORDER BY e.position, e.id`;
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

const NUMERIC_NUMBER = /^\d+(\.\d+)?$/;

/**
 * The `hadith_number` of the row whose merged span (`number_first`..`number_last`) covers `hadithNumber`, or null. Only a
 * numeric input is looked up; the bounds are compared as numbers (`CAST ... AS REAL`), never as text. The lowest id
 * wins when two spans cover the number.
 */
export function findCoveringHadithNumber(db: SqlExecutor, resourceId: number, hadithNumber: string): string | null {
  if (!NUMERIC_NUMBER.test(hadithNumber)) {
    return null;
  }
  const value = Number(hadithNumber);
  const row = db.get<{ hadithNumber: string }>(
    `SELECT hadith_number AS hadithNumber
     FROM hadith_entries
     WHERE resource_id = ? AND number_first IS NOT NULL AND number_last IS NOT NULL
       AND CAST(number_first AS REAL) <= ? AND CAST(number_last AS REAL) >= ?
     ORDER BY id
     LIMIT 1`,
    [resourceId, value, value],
  );
  return row?.hadithNumber ?? null;
}

const DETAIL_SELECT = `SELECT e.resource_id AS resourceId, e.id, e.book_id AS bookId, e.chapter_id AS chapterId,
            e.hadith_number AS hadithNumber, e.arabic_number AS arabicNumber, e.position, e.text_ar AS textAr,
            e.number_first AS numberFirst, e.number_last AS numberLast, e.source_code AS sourceCode,
            c.slug AS collectionSlug,
            b.book_number AS bookNumber, b.title_ar AS bookTitleAr, b.title_en AS bookTitleEn, b.position AS bookPosition,
            ch.chapter_number AS chapterNumber, ch.title_ar AS chapterTitleAr, ch.title_en AS chapterTitleEn,
            e.source_url AS sourceUrl
     FROM hadith_entries e
     JOIN hadith_collections c ON c.resource_id = e.resource_id
     JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
     LEFT JOIN hadith_chapters ch ON ch.resource_id = e.resource_id AND ch.id = e.chapter_id`;

function detailByNumber(db: SqlExecutor, resourceId: number, hadithNumber: string): DetailRow | undefined {
  return db.get<DetailRow>(`${DETAIL_SELECT} WHERE e.resource_id = ? AND e.hadith_number = ? ORDER BY e.id LIMIT 1`, [
    resourceId,
    hadithNumber,
  ]);
}

/**
 * One hadith by slug and number. An exact `hadith_number` match wins (when two rows share it, the lower id; Open question
 * 5). Otherwise a merged row whose span covers the number. The result has exactly the keys of `HadithDetail`: no grade,
 * no English text, no search column.
 */
export function getHadith(db: SqlExecutor, slug: string, hadithNumber: string): HadithDetail | undefined {
  const resourceId = hadithResourceId(db, slug);
  if (resourceId === undefined) {
    return undefined;
  }
  let row = detailByNumber(db, resourceId, hadithNumber);
  if (row === undefined) {
    const covering = findCoveringHadithNumber(db, resourceId, hadithNumber);
    row = covering === null ? undefined : detailByNumber(db, resourceId, covering);
  }
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
    numberFirst: row.numberFirst,
    numberLast: row.numberLast,
    sourceCode: row.sourceCode,
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
  authorName: string | null;
  authorAr: string | null;
  version: number;
  packSizeBytes: number;
  installedFlag: number;
  slug: string | null;
  sourceKey: string | null;
};

type OutlineRow = {
  position: number;
  hadithNumber: string;
  chapterId: number | null;
  numberFirst: string | null;
  numberLast: string | null;
};

type OutlineRun = Extract<HadithBookOutlineItem, { kind: 'run' }>;

/**
 * Maximal runs of rows with no chapter, in position order. A run's first number is the first row's span start and its
 * last number is the last row's span end, so a merged row at an edge keeps the whole span.
 */
function outlineRuns(rows: readonly OutlineRow[]): OutlineRun[] {
  const runs: OutlineRun[] = [];
  let open: OutlineRow[] = [];
  const close = () => {
    const first = open[0];
    const last = open[open.length - 1];
    if (first === undefined || last === undefined) {
      return;
    }
    runs.push({
      kind: 'run',
      firstNumber: first.numberFirst ?? first.hadithNumber,
      lastNumber: last.numberLast ?? last.hadithNumber,
      count: open.length,
      firstPosition: first.position,
      lastPosition: last.position,
    });
    open = [];
  };
  for (const row of rows) {
    if (row.chapterId === null) {
      open.push(row);
    } else {
      close();
    }
  }
  close();
  return runs;
}

/**
 * The outline of a book (ADR 0076, option B): every chapter in order, with the runs of chapterless hadith placed between
 * them by position. A chapter has no position of its own on the entry scale, so it starts where its first hadith sits;
 * a chapter with no hadith starts where the chapter before it starts. A book with no chapters returns `[]`, and the
 * screen shows its flat list instead.
 */
export function listBookOutline(db: SqlExecutor, resourceId: number, bookId: number): HadithBookOutlineItem[] {
  const chapters = db.all<HadithChapter>(
    `SELECT c.resource_id AS resourceId, c.id, c.book_id AS bookId, c.chapter_number AS chapterNumber,
            c.title_ar AS titleAr, c.title_en AS titleEn, c.position, c.hadith_count AS hadithCount,
            CASE WHEN c.hadith_count = 1 THEN
              (SELECT e.hadith_number FROM hadith_entries e
               WHERE e.resource_id = c.resource_id AND e.chapter_id = c.id ORDER BY e.position, e.id LIMIT 1)
            END AS soleHadithNumber
     FROM hadith_chapters c
     WHERE c.resource_id = ? AND c.book_id = ?
     ORDER BY c.position, c.id`,
    [resourceId, bookId],
  );
  if (chapters.length === 0) {
    return [];
  }
  const rows = db.all<OutlineRow>(
    `SELECT e.position AS position, e.hadith_number AS hadithNumber, e.chapter_id AS chapterId,
            e.number_first AS numberFirst, e.number_last AS numberLast
     FROM hadith_entries e
     WHERE e.resource_id = ? AND e.book_id = ?
     ORDER BY e.position, e.id`,
    [resourceId, bookId],
  );

  const firstRowOfChapter = new Map<number, number>();
  for (const row of rows) {
    if (row.chapterId !== null && !firstRowOfChapter.has(row.chapterId)) {
      firstRowOfChapter.set(row.chapterId, row.position);
    }
  }

  const runs = outlineRuns(rows);
  const outline: HadithBookOutlineItem[] = [];
  let nextRun = 0;
  let start = Number.NEGATIVE_INFINITY;
  for (const chapter of chapters) {
    start = firstRowOfChapter.get(chapter.id) ?? start;
    let pending = runs[nextRun];
    while (pending !== undefined && pending.firstPosition < start) {
      outline.push(pending);
      nextRun += 1;
      pending = runs[nextRun];
    }
    outline.push({ kind: 'chapter', chapter });
  }
  outline.push(...runs.slice(nextRun));
  return outline;
}

export function listHadithCatalog(db: SqlExecutor): HadithCatalogEntry[] {
  const rows = db.all<CatalogRow>(
    `SELECT cr.resource_id AS resourceId, cr.name AS name, cr.name_ar AS nameAr,
            cr.author_name AS authorName, cr.author_ar AS authorAr, cr.version AS version,
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
    authorEn: row.authorName,
    authorAr: row.authorAr,
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
