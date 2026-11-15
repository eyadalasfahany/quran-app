import type { SqlExecutor } from '@/core/db/sql-executor';
import { listHisnDuaEntries, listHisnDuaTopics, type QuranPreviewRef } from '@/features/azkar/data';
import { listBookHadith, listBooks } from '@/features/hadith/data';

import { activeDuasResourceId } from './active-resource';
import { listPropheticDuasInGroup, listQuranicDuas } from './content-repository';
import type { DuaCategory, DuaCategoryItem } from './model';

/**
 * Duas categories (ADR 0091). Four kinds, in this order: the Quranic duas (one category), each HadeethEnc dua group
 * (its title as received), each hadith book of supplication (read from the hadith pack on the device), and each Azkar
 * browse topic that holds a Hisn dua. A category with no items is never listed, so no category is a dead end. A
 * missing pack contributes nothing.
 */

export const QURAN_DUA_CATEGORY_ID = 'quran';
const HADEETHENC_PREFIX = 'hadeethenc:';
const HISN_PREFIX = 'hisn:';
const HADITH_BOOK_PREFIX = 'hadithbook:';
const COLLECTION_SLUG_PATTERN = /^[a-z0-9]+$/;

export type ParsedDuaCategoryId =
  | { kind: 'quran' }
  | { kind: 'hadeethenc'; groupId: number }
  | { kind: 'hisn'; topicId: string }
  | { kind: 'hadithbook'; collectionSlug: string; bookNumber: string };

/** Reads a category id from the route. Returns null for an id no category can have. */
export function parseDuaCategoryId(id: string): ParsedDuaCategoryId | null {
  if (id === QURAN_DUA_CATEGORY_ID) {
    return { kind: 'quran' };
  }
  if (id.startsWith(HADEETHENC_PREFIX)) {
    const raw = id.slice(HADEETHENC_PREFIX.length);
    return /^\d+$/.test(raw) ? { kind: 'hadeethenc', groupId: Number(raw) } : null;
  }
  if (id.startsWith(HISN_PREFIX)) {
    const topicId = id.slice(HISN_PREFIX.length);
    return topicId.length > 0 ? { kind: 'hisn', topicId } : null;
  }
  if (id.startsWith(HADITH_BOOK_PREFIX)) {
    const rest = id.slice(HADITH_BOOK_PREFIX.length);
    const separator = rest.indexOf(':');
    if (separator === -1) {
      return null;
    }
    const collectionSlug = rest.slice(0, separator);
    const bookNumber = rest.slice(separator + 1);
    return COLLECTION_SLUG_PATTERN.test(collectionSlug) && bookNumber.length > 0
      ? { kind: 'hadithbook', collectionSlug, bookNumber }
      : null;
  }
  return null;
}

/** The route id of a hadith book category (ADR 0091 part 4): `hadithbook:<slug>:<bookNumber>`. */
export function hadithBookCategoryId(collectionSlug: string, bookNumber: string): string {
  return `${HADITH_BOOK_PREFIX}${collectionSlug}:${bookNumber}`;
}

/** Formats a Quran passage for a card. The screen passes the locale's label; without one a card shows no reference. */
export type QuranReferenceFormatter = (ref: QuranPreviewRef) => string | null;

const noQuranReference: QuranReferenceFormatter = () => null;

type HadeethencGroupCount = { id: number; title: string; count: number };

/**
 * The HadeethEnc groups that hold at least one prophetic dua, in group position order. The count joins the same rows
 * that `listPropheticDuasInGroup` reads, so the two agree.
 */
function listHadeethencGroupCounts(db: SqlExecutor): HadeethencGroupCount[] {
  const resourceId = activeDuasResourceId(db);
  if (resourceId === -1) {
    return [];
  }

  return db.all<HadeethencGroupCount>(
    `SELECT g.id AS id, g.title AS title, COUNT(i.id) AS count
     FROM dua_groups g
     JOIN dua_items i ON i.resource_id = g.resource_id AND i.group_id = g.id AND i.kind = 'hadith'
     JOIN dua_hadith h ON h.resource_id = i.resource_id AND h.item_id = i.id
     WHERE g.resource_id = ?
     GROUP BY g.id, g.title, g.position
     HAVING COUNT(i.id) > 0
     ORDER BY g.position`,
    [resourceId],
  );
}

type HadithBookRow = { collectionSlug: string; bookNumber: string };

/** The hadith book of a collection by its book number, or undefined when the pack or the book is missing. */
function findHadithBook(db: SqlExecutor, collectionSlug: string, bookNumber: string) {
  return listBooks(db, collectionSlug).find((book) => book.bookNumber === bookNumber);
}

/**
 * The hadith books of supplication (content plan, decision 18), in `dua_collection_books` position order. A book is
 * listed only when its collection pack is installed and the book holds at least one hadith. Its name is the Arabic
 * title (null when empty: the UI falls back to «كتاب {n}»); its count is the book's hadith count. Nothing is copied into
 * the duas pack.
 */
function listHadithBookCategories(db: SqlExecutor): DuaCategory[] {
  const resourceId = activeDuasResourceId(db);
  if (resourceId === -1) {
    return [];
  }

  const rows = db.all<HadithBookRow>(
    `SELECT collection_slug AS collectionSlug, book_number AS bookNumber
     FROM dua_collection_books
     WHERE resource_id = ?
     ORDER BY position, id`,
    [resourceId],
  );

  const categories: DuaCategory[] = [];
  for (const row of rows) {
    const book = findHadithBook(db, row.collectionSlug, row.bookNumber);
    if (book === undefined || book.hadithCount < 1) {
      continue;
    }
    categories.push({
      id: hadithBookCategoryId(row.collectionSlug, row.bookNumber),
      kind: 'hadithbook',
      titleKey: null,
      title: book.titleAr === null || book.titleAr.trim() === '' ? null : book.titleAr,
      count: book.hadithCount,
      sourceKind: 'hadith',
      bookNumber: row.bookNumber,
    });
  }
  return categories;
}

/** Every non-empty Duas category, in display order: Quran, HadeethEnc groups, hadith books, then Hisn topics. */
export function listDuaCategories(db: SqlExecutor): DuaCategory[] {
  const categories: DuaCategory[] = [];

  const quranCount = listQuranicDuas(db).length;
  if (quranCount > 0) {
    categories.push({
      id: QURAN_DUA_CATEGORY_ID,
      kind: 'quran',
      titleKey: 'duas.categories.quran',
      title: null,
      count: quranCount,
      sourceKind: 'duas',
    });
  }

  for (const group of listHadeethencGroupCounts(db)) {
    categories.push({
      id: `${HADEETHENC_PREFIX}${group.id}`,
      kind: 'hadeethenc',
      titleKey: null,
      title: group.title,
      count: group.count,
      sourceKind: 'duas',
    });
  }

  categories.push(...listHadithBookCategories(db));

  for (const topic of listHisnDuaTopics(db)) {
    categories.push({
      id: `${HISN_PREFIX}${topic.id}`,
      kind: 'hisn',
      titleKey: `azkar.categories.${topic.id}`,
      title: null,
      count: topic.count,
      sourceKind: 'azkar',
    });
  }

  return categories;
}

/**
 * The cards of one category, in the category's order. An unknown or empty category returns []. A Quranic card carries
 * its reference only, never the verse text; a Hisn card carries the Azkar preview and references.
 */
export function listDuaCategoryItems(
  db: SqlExecutor,
  categoryId: string,
  quranReference: QuranReferenceFormatter = noQuranReference,
): DuaCategoryItem[] {
  const parsed = parseDuaCategoryId(categoryId);
  if (parsed === null) {
    return [];
  }

  switch (parsed.kind) {
    case 'quran':
      return listQuranicDuas(db).map((dua) => ({
        kind: 'quran',
        duaKey: dua.duaKey,
        quranReference: quranReference({
          surah: dua.surah,
          verseFrom: dua.verseFrom,
          verseTo: dua.verseTo ?? dua.verseFrom,
        }),
      }));

    case 'hadeethenc':
      return listPropheticDuasInGroup(db, parsed.groupId).map((dua) => ({
        kind: 'hadith',
        duaKey: dua.duaKey,
        preview: dua.title,
      }));

    case 'hadithbook': {
      const book = findHadithBook(db, parsed.collectionSlug, parsed.bookNumber);
      if (book === undefined) {
        return [];
      }
      return listBookHadith(db, parsed.collectionSlug, book.id).map((hadith) => ({
        kind: 'hadith-entry',
        slug: parsed.collectionSlug,
        hadithNumber: hadith.hadithNumber,
        preview: hadith.textAr,
      }));
    }

    case 'hisn':
      return listHisnDuaEntries(db, parsed.topicId).map((entry) => ({
        kind: 'hisn',
        entryKey: entry.entryKey,
        chapterTitle: entry.chapterTitle,
        preview: entry.preview,
        quranRefs: entry.quranRefs,
        bookNumber: entry.bookNumber,
      }));
  }
}
