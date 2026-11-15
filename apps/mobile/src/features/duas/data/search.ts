import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';
import {
  categoryMatchRange,
  escapeLike,
  mapMatchToOriginal,
  matchesCategoryLabel,
  searchHisnDuas,
  snippetAround,
  type MatchRange,
} from '@/features/azkar/data';
import { getChapter } from '@/features/reader/data/chapters';

import { activeDuasResourceId } from './active-resource';
import { listDuaCategories, QURAN_DUA_CATEGORY_ID } from './categories';
import { listQuranicDuas } from './content-repository';
import type { DuaCategory } from './model';

/**
 * Duas search (screens/, #DuasSearch). It finds three things for one query, all normalised as Azkar search is:
 * - categories whose name matches (listed first);
 * - Quranic duas by their surah name only, never by verse text (ADR 0091);
 * - HadeethEnc duas whose text matches (`dua_hadith.text_search`), and Hisn duas whose Azkar text matches.
 * A Hisn match is an Azkar entry, so it opens the Azkar reader.
 */

export const DUAS_SEARCH_LIMIT = 50;

/** Hadith rows read before hits are grouped. A cap keeps a very common query bounded. */
const MAX_HADITH_ROWS = 500;

export type DuaSearchCategory = {
  category: DuaCategory;
  /** The category's name as shown (the caller's translation). */
  label: string;
  highlight: MatchRange | null;
};

export type DuaSearchHit =
  | {
      kind: 'quran';
      key: string;
      duaKey: string;
      categoryId: string;
      surah: number;
      verseFrom: number;
      verseTo: number;
    }
  | {
      kind: 'hadith';
      key: string;
      duaKey: string;
      categoryId: string | null;
      /** The HadeethEnc text, cut to a window around the match when it is long. Never altered. */
      preview: string;
      highlight: MatchRange | null;
    }
  | {
      kind: 'hisn';
      key: string;
      entryKey: string;
      categoryId: string;
      preview: string;
      highlight: MatchRange | null;
    };

export type DuaSearchResult = {
  categories: DuaSearchCategory[];
  duas: DuaSearchHit[];
};

/**
 * Categories whose name matches, then the duas that match: Quranic (by surah name), HadeethEnc (by text), Hisn (by text).
 * An empty query returns nothing. A missing pack contributes nothing.
 */
export function searchDuas(
  db: SqlExecutor,
  rawQuery: string,
  labelOf: (category: DuaCategory) => string,
  limit = DUAS_SEARCH_LIMIT,
): DuaSearchResult {
  const query = normalizeForSearch(rawQuery);
  if (query.length === 0) {
    return { categories: [], duas: [] };
  }

  const categories: DuaSearchCategory[] = [];
  for (const category of listDuaCategories(db)) {
    const label = labelOf(category);
    if (matchesCategoryLabel(rawQuery, label)) {
      categories.push({ category, label, highlight: categoryMatchRange(label, rawQuery) });
    }
  }

  const duas: DuaSearchHit[] = [
    ...quranHits(db, rawQuery),
    ...hadithHits(db, query),
    ...hisnHits(db, rawQuery, limit),
  ].slice(0, limit);

  return { categories, duas };
}

/** Quranic duas whose surah's Arabic or transliterated name matches. The reference is formatted by the caller. */
function quranHits(db: SqlExecutor, rawQuery: string): DuaSearchHit[] {
  const hits: DuaSearchHit[] = [];
  for (const dua of listQuranicDuas(db)) {
    const chapter = getChapter(db, dua.surah);
    if (chapter === undefined) {
      continue;
    }
    if (!matchesCategoryLabel(rawQuery, chapter.nameArabic) && !matchesCategoryLabel(rawQuery, chapter.nameSimple)) {
      continue;
    }
    hits.push({
      kind: 'quran',
      key: `quran:${dua.duaKey}`,
      duaKey: dua.duaKey,
      categoryId: QURAN_DUA_CATEGORY_ID,
      surah: dua.surah,
      verseFrom: dua.verseFrom,
      verseTo: dua.verseTo ?? dua.verseFrom,
    });
  }
  return hits;
}

/** HadeethEnc duas whose normalised text contains the query, in group then item order. */
function hadithHits(db: SqlExecutor, query: string): DuaSearchHit[] {
  const resourceId = activeDuasResourceId(db);
  if (resourceId === -1) {
    return [];
  }

  const rows = db.all<{ duaKey: string; groupId: number | null; hadeeth: string; textSearch: string }>(
    `SELECT
       i.dua_key AS duaKey,
       i.group_id AS groupId,
       h.hadeeth AS hadeeth,
       h.text_search AS textSearch
     FROM dua_items i
     JOIN dua_hadith h ON h.resource_id = i.resource_id AND h.item_id = i.id
     LEFT JOIN dua_groups g ON g.resource_id = i.resource_id AND g.id = i.group_id
     WHERE i.resource_id = ? AND i.kind = 'hadith' AND h.text_search LIKE ? ESCAPE '\\'
     ORDER BY CASE WHEN g.position IS NULL THEN 1 ELSE 0 END, g.position, i.position
     LIMIT ?`,
    [resourceId, `%${escapeLike(query)}%`, MAX_HADITH_ROWS],
  );

  return rows.map((row) => {
    const window = snippetAround(row.hadeeth, mapMatchToOriginal(row.hadeeth, row.textSearch, query));
    return {
      kind: 'hadith',
      key: `hadith:${row.duaKey}`,
      duaKey: row.duaKey,
      categoryId: row.groupId === null ? null : `hadeethenc:${row.groupId}`,
      preview: window.text,
      highlight: window.highlight,
    };
  });
}

/** Hisn duas whose Azkar text matches, each under its first browse topic. */
function hisnHits(db: SqlExecutor, rawQuery: string, limit: number): DuaSearchHit[] {
  return searchHisnDuas(db, rawQuery, limit).map((hit) => {
    const window = snippetAround(hit.preview, hit.highlight);
    return {
      kind: 'hisn',
      key: `hisn:${hit.entryKey}`,
      entryKey: hit.entryKey,
      categoryId: `hisn:${hit.topicId}`,
      preview: window.text,
      highlight: window.highlight,
    };
  });
}
