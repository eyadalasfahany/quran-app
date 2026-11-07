import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

/**
 * TEST ONLY. Placeholder hadith rows for the Jest suites. Every text is a marked placeholder («نص تجريبي ... ليس حديثًا»,
 * `FIXTURE text ... not a hadith`). They are never a hadith, never packed, and never loaded by the app: no production
 * code may import this module (ADR 0042, 2 Nov 2026).
 */

export const FIXTURE_SOURCE_CODE = 'taybah-dev-fixture';
export const FIXTURE_MULTI = { resourceId: -1, slug: 'fixture-multi' } as const;
export const FIXTURE_SINGLE = { resourceId: -2, slug: 'fixture-single' } as const;

const TITLE_EN = 'FIXTURE title — not a hadith';
const TITLE_CHAPTER = '[عنوان تجريبي]';
const ARABIC_PLACEHOLDER = 'نص تجريبي ١ — ليس حديثًا';
const BIDI_MARK = '‏';

type FixtureBook = {
  id: number;
  bookNumber: string;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
};

type FixtureChapter = {
  id: number;
  bookId: number;
  chapterNumber: number;
  titleAr: string | null;
  position: number;
  hadithCount: number;
};

type FixtureEntry = {
  id: number;
  bookId: number;
  chapterId: number | null;
  hadithNumber: string;
  arabicNumber: string | null;
  position: number;
  textAr: string;
};

type FixtureCollection = {
  resourceId: number;
  slug: string;
  id: number;
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  totalHadith: number;
  booksCount: number;
  books: FixtureBook[];
  chapters: FixtureChapter[];
  entries: FixtureEntry[];
};

const MULTI_ENTRIES: FixtureEntry[] = [
  { id: 1, bookId: 1, chapterId: 1, hadithNumber: '1', arabicNumber: null, position: 1, textAr: 'FIXTURE text 1 — not a hadith' },
  { id: 2, bookId: 1, chapterId: 2, hadithNumber: '2', arabicNumber: null, position: 2, textAr: 'FIXTURE text 2 — not a hadith' },
  { id: 3, bookId: 2, chapterId: null, hadithNumber: '3', arabicNumber: null, position: 1, textAr: 'FIXTURE text 3 — not a hadith' },
  { id: 4, bookId: 2, chapterId: null, hadithNumber: '3.1', arabicNumber: '3.1', position: 2, textAr: 'FIXTURE text 4 — not a hadith' },
  { id: 5, bookId: 2, chapterId: null, hadithNumber: '4', arabicNumber: null, position: 3, textAr: ARABIC_PLACEHOLDER },
  { id: 6, bookId: 3, chapterId: null, hadithNumber: '5', arabicNumber: null, position: 1, textAr: `FIXTURE text 6 — not a hadith${BIDI_MARK}` },
  { id: 7, bookId: 3, chapterId: null, hadithNumber: '6', arabicNumber: null, position: 2, textAr: 'FIXTURE text 7 — not a hadith' },
];

const SINGLE_ENTRIES: FixtureEntry[] = [1, 2, 3].map((id) => ({
  id,
  bookId: 1,
  chapterId: null,
  hadithNumber: String(id),
  arabicNumber: null,
  position: id,
  textAr: `FIXTURE text ${id} — not a hadith`,
}));

const COLLECTIONS: FixtureCollection[] = [
  {
    resourceId: FIXTURE_MULTI.resourceId,
    slug: FIXTURE_MULTI.slug,
    id: 1,
    titleAr: null,
    titleEn: TITLE_EN,
    authorAr: null,
    totalHadith: 7,
    booksCount: 3,
    books: [
      { id: 1, bookNumber: '1', titleAr: null, titleEn: null, position: 1, hadithCount: 2 },
      { id: 2, bookNumber: '2', titleAr: TITLE_CHAPTER, titleEn: TITLE_EN, position: 2, hadithCount: 3 },
      { id: 3, bookNumber: '3', titleAr: null, titleEn: null, position: 3, hadithCount: 2 },
    ],
    chapters: [
      { id: 1, bookId: 1, chapterNumber: 1, titleAr: null, position: 1, hadithCount: 1 },
      { id: 2, bookId: 1, chapterNumber: 2, titleAr: TITLE_CHAPTER, position: 2, hadithCount: 1 },
    ],
    entries: MULTI_ENTRIES,
  },
  {
    resourceId: FIXTURE_SINGLE.resourceId,
    slug: FIXTURE_SINGLE.slug,
    id: 1,
    titleAr: TITLE_CHAPTER,
    titleEn: null,
    authorAr: null,
    totalHadith: 3,
    booksCount: 2,
    books: [
      { id: 1, bookNumber: '1', titleAr: null, titleEn: null, position: 1, hadithCount: 3 },
      { id: 2, bookNumber: '0', titleAr: null, titleEn: null, position: 2, hadithCount: 0 },
    ],
    chapters: [],
    entries: SINGLE_ENTRIES,
  },
];

/**
 * Loads the two fixture collections (resource ids -1 and -2) into an open content.db. Idempotent: the fixture rows
 * of both resources are deleted first. Writes no grade and no alias rows.
 */
export function loadHadithDevFixtures(db: SqlExecutor): void {
  db.transaction(() => {
    for (const collection of COLLECTIONS) {
      deleteFixtureRows(db, collection.resourceId);
    }
    for (const collection of COLLECTIONS) {
      insertCollection(db, collection);
    }
  });
}

function deleteFixtureRows(db: SqlExecutor, resourceId: number): void {
  for (const table of [
    'search_hadith',
    'hadith_ref_aliases',
    'hadith_grades',
    'hadith_entries',
    'hadith_chapters',
    'hadith_books',
    'hadith_collections',
    'installed_resources',
    'catalog_resources',
  ]) {
    db.run(`DELETE FROM ${table} WHERE resource_id = ?`, [resourceId]);
  }
}

function insertCollection(db: SqlExecutor, collection: FixtureCollection): void {
  const resourceId = collection.resourceId;

  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar)
     VALUES (?, 'hadith_collections', 1, 'fixture', 0, ?, ?)`,
    [resourceId, TITLE_EN, null],
  );
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
     VALUES (?, 'hadith_collections', ?, NULL, 1, 1024, 0)`,
    [resourceId, TITLE_EN],
  );
  db.run(
    `INSERT INTO hadith_collections (resource_id, id, slug, source_code, title_ar, title_en, author_ar, author_en,
                                     attribution_ar, attribution_en, source_url, total_hadith, books_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FIXTURE attribution', 'FIXTURE attribution', NULL, ?, ?)`,
    [
      resourceId,
      collection.id,
      collection.slug,
      FIXTURE_SOURCE_CODE,
      collection.titleAr,
      collection.titleEn,
      collection.authorAr,
      'FIXTURE author',
      collection.totalHadith,
      collection.booksCount,
    ],
  );
  for (const book of collection.books) {
    db.run(
      `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [resourceId, book.id, book.bookNumber, book.titleAr, book.titleEn, book.position, book.hadithCount],
    );
  }
  for (const chapter of collection.chapters) {
    db.run(
      `INSERT INTO hadith_chapters (resource_id, id, book_id, chapter_number, source_chapter_key, title_ar, title_en, position, hadith_count)
       VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?)`,
      [resourceId, chapter.id, chapter.bookId, chapter.chapterNumber, chapter.titleAr, chapter.position, chapter.hadithCount],
    );
  }
  for (const entry of collection.entries) {
    const textSearch = normalizeHadithForSearch(entry.textAr);
    db.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar,
                                   text_en, narrator_en, text_search, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL)`,
      [resourceId, entry.id, entry.bookId, entry.chapterId, entry.hadithNumber, entry.arabicNumber, entry.position, entry.textAr, textSearch],
    );
    db.run('INSERT INTO search_hadith (entry_id, resource_id, text_search) VALUES (?, ?, ?)', [
      entry.id,
      resourceId,
      textSearch,
    ]);
  }
}
