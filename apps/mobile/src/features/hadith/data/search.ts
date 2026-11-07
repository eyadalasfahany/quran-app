import type { SqlExecutor } from '@/core/db/sql-executor';
import { buildFtsMatch } from '@/features/search/ftsQuery';

import type { HadithCollectionRef, HadithListItem, HadithSearchHit, HadithSearchPage } from '../types';
import { hadithResourceId } from './active-resource';
import { listInstalledCollections } from './content-repository';
import { highlightRanges, queryTokens } from './text-map';

export const HADITH_SEARCH_PAGE_SIZE = 50;

type HitRow = {
  entryId: number;
  resourceId: number;
};

type HitDetailRow = HadithListItem & {
  bookNumber: string;
  slug: string;
  titleAr: string | null;
  titleEn: string | null;
  attributionAr: string;
  attributionEn: string;
};

/**
 * Full-text search over the installed hadith collections (ADR 0042 §8). The query goes through the hadith normaliser
 * (`queryTokens`), never the Quran one. `text_search` is never read or returned; the hits carry the stored text.
 */
export function searchHadith(
  db: SqlExecutor,
  rawQuery: string,
  options: { slugs?: readonly string[]; limit?: number; offset?: number } = {},
): HadithSearchPage {
  const empty: HadithSearchPage = { hits: [], hasMore: false };
  const tokens = queryTokens(rawQuery);
  const match = buildFtsMatch(tokens);
  if (match === null) {
    return empty;
  }

  const resourceIds = scopeResourceIds(db, options.slugs);
  if (resourceIds.length === 0) {
    return empty;
  }

  const limit = options.limit ?? HADITH_SEARCH_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const placeholders = resourceIds.map(() => '?').join(', ');
  const rows = db.all<HitRow>(
    `SELECT entry_id AS entryId, resource_id AS resourceId
     FROM search_hadith
     WHERE search_hadith MATCH ?
       AND resource_id IN (${placeholders})
     ORDER BY bm25(search_hadith), resource_id, entry_id
     LIMIT ? OFFSET ?`,
    [match, ...resourceIds, limit + 1, offset],
  );

  const numbers = new Map(listInstalledCollections(db).map((collection) => [collection.resourceId, collection.number]));
  const hits: HadithSearchHit[] = [];
  for (const row of rows.slice(0, limit)) {
    const hit = loadHit(db, row, tokens, numbers);
    if (hit !== undefined) {
      hits.push(hit);
    }
  }

  return { hits, hasMore: rows.length > limit };
}

/** The installed resource ids to search: the requested slugs that are installed, or every installed collection. */
function scopeResourceIds(db: SqlExecutor, slugs: readonly string[] | undefined): number[] {
  if (slugs !== undefined) {
    const ids = slugs
      .map((slug) => hadithResourceId(db, slug))
      .filter((id): id is number => id !== undefined);
    return [...new Set(ids)];
  }
  return db
    .all<{ resourceId: number }>(
      `SELECT resource_id AS resourceId FROM installed_resources WHERE "group" = 'hadith_collections' ORDER BY resource_id`,
    )
    .map((row) => row.resourceId);
}

function loadHit(
  db: SqlExecutor,
  row: HitRow,
  tokens: readonly string[],
  numbers: ReadonlyMap<number, number>,
): HadithSearchHit | undefined {
  const detail = db.get<HitDetailRow>(
    `SELECT e.resource_id AS resourceId, e.id, e.book_id AS bookId, e.chapter_id AS chapterId,
            e.hadith_number AS hadithNumber, e.arabic_number AS arabicNumber, e.position, e.text_ar AS textAr,
            b.book_number AS bookNumber,
            c.slug AS slug, c.title_ar AS titleAr, c.title_en AS titleEn,
            c.attribution_ar AS attributionAr, c.attribution_en AS attributionEn
     FROM hadith_entries e
     JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
     JOIN hadith_collections c ON c.resource_id = e.resource_id
     WHERE e.resource_id = ? AND e.id = ?
     LIMIT 1`,
    [row.resourceId, row.entryId],
  );
  if (detail === undefined) {
    return undefined;
  }

  const collection: HadithCollectionRef = {
    slug: detail.slug,
    number: numbers.get(detail.resourceId) ?? 0,
    titleAr: detail.titleAr,
    titleEn: detail.titleEn,
    attributionAr: detail.attributionAr,
    attributionEn: detail.attributionEn,
  };

  return {
    item: {
      resourceId: detail.resourceId,
      id: detail.id,
      bookId: detail.bookId,
      chapterId: detail.chapterId,
      hadithNumber: detail.hadithNumber,
      arabicNumber: detail.arabicNumber,
      position: detail.position,
      textAr: detail.textAr,
    },
    collection,
    bookNumber: detail.bookNumber,
    ranges: highlightRanges(detail.textAr, tokens),
  };
}
