import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { activeAzkarResourceId } from './active-resource';
import { getEntry } from './content-repository';
import { quranRefs, recitationPreview, type QuranPreviewRef } from './preview';
import { escapeLike, mapMatchToOriginal, type MatchRange } from './search';

/**
 * Hisn al-Muslim duas as Duas sees them (ADR 0091). A Hisn dua is an Azkar entry with `home = 'duas'`: it keeps its
 * Azkar text, chapter and reader, and Duas only groups it by browse topic. Session categories never count, and an
 * entry in a session stays whole in Azkar (ADR 0091, open point 3), even when its `home` says `duas`.
 *
 * Every function reads the active azkar resource only. With no azkar pack installed they return nothing.
 */

export type HisnDuaTopic = {
  /** The browse category id, which is also the Azkar i18n suffix (`azkar.categories.<id>`). */
  id: string;
  position: number;
  /** The distinct Hisn duas in the topic. An entry linked twice (two variation rows) counts once. */
  count: number;
};

export type HisnDuaEntry = {
  entryKey: string;
  /** The chapter's Arabic title as the source gives it (`azkar_chapters.title_ar`), or null. */
  chapterTitle: string | null;
  /** The first Arabic text segment of the entry's active variation, or null. Never Quran text. */
  preview: string | null;
  /** Every Quran passage of the entry in order (surah and verses only, never the verse text). */
  quranRefs: QuranPreviewRef[];
  /** The source's reference for the entry (`azkar_entries.source_reference`), shown as the book number. */
  bookNumber: string;
};

/**
 * The browse-topic links of Hisn duas: `azkar_entry_categories` rows of a browse category whose entry has `home =
 * 'duas'` and is in no session category. The `?` is the active azkar resource id. Callers add their own tail
 * (grouping, or one topic's id and ordering).
 */
function hisnDuaLinks(): string {
  return `
    FROM azkar_entry_categories ec
    JOIN azkar_categories c ON c.resource_id = ec.resource_id AND c.id = ec.category_id
    JOIN azkar_entries e ON e.resource_id = ec.resource_id AND e.id = ec.entry_id
    JOIN azkar_chapters ch ON ch.resource_id = e.resource_id AND ch.id = e.chapter_id
    WHERE ec.resource_id = ?
      AND c.kind = 'browse'
      AND e.home = 'duas'
      AND NOT EXISTS (
        SELECT 1 FROM azkar_entry_categories sec
        JOIN azkar_categories sc ON sc.resource_id = sec.resource_id AND sc.id = sec.category_id
        WHERE sec.resource_id = e.resource_id AND sec.entry_id = e.id AND sc.kind = 'session'
      )`;
}

/** Browse topics that hold at least one Hisn dua, in `azkar_categories.position` order. */
export function listHisnDuaTopics(db: SqlExecutor): HisnDuaTopic[] {
  return db.all<HisnDuaTopic>(
    `SELECT c.id AS id, c.position AS position, COUNT(DISTINCT e.id) AS count
     ${hisnDuaLinks()}
     GROUP BY c.id, c.position
     ORDER BY c.position, c.id`,
    [activeAzkarResourceId(db)],
  );
}

/**
 * The Hisn duas of one browse topic, in chapter order then entry position. Each entry appears once, even when it is
 * linked to the topic by more than one variation row. Unknown or empty topics return [].
 */
export function listHisnDuaEntries(db: SqlExecutor, topicId: string): HisnDuaEntry[] {
  const links = db.all<{ entryKey: string; linkVariationKey: string }>(
    `SELECT e.entry_key AS entryKey, ec.variation_key AS linkVariationKey, ch.number AS chapterNumber, e.position AS position, e.id AS id
     ${hisnDuaLinks()}
       AND c.id = ?
     ORDER BY ch.number, e.position, e.id, ec.variation_key`,
    [activeAzkarResourceId(db), topicId],
  );

  const entries: HisnDuaEntry[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (seen.has(link.entryKey)) {
      continue;
    }
    seen.add(link.entryKey);

    // `getEntry` gives the reader's rules: the requested alternative, else the first. The link's own variation wins
    // when it names one (a fixed link shows that variation only); `'*'` keeps the entry's active alternative.
    const detail = getEntry(db, link.entryKey, { [link.entryKey]: link.linkVariationKey });
    if (detail === undefined) {
      continue;
    }
    const fixedMissing = link.linkVariationKey !== '*' && detail.activeVariation !== link.linkVariationKey;
    const items = fixedMissing ? [] : detail.items;

    entries.push({
      entryKey: link.entryKey,
      chapterTitle: detail.chapter?.titleAr ?? null,
      preview: recitationPreview(items),
      quranRefs: quranRefs(items),
      bookNumber: detail.entry.sourceReference,
    });
  }
  return entries;
}

/** The segments read before hits are grouped. A cap keeps a very common query bounded (as in Azkar search). */
const MAX_HISN_SEGMENT_ROWS = 500;

/** The Hisn dua ids of entries that are Hisn duas (`home = 'duas'`, not in a session), as a SQL condition on `e`. */
const HISN_ENTRY = `e.home = 'duas' AND NOT EXISTS (
  SELECT 1 FROM azkar_entry_categories sec
  JOIN azkar_categories sc ON sc.resource_id = sec.resource_id AND sc.id = sec.category_id
  WHERE sec.resource_id = e.resource_id AND sec.entry_id = e.id AND sc.kind = 'session')`;

export type HisnDuaSearchHit = {
  entryKey: string;
  /** The browse topic the hit is listed under: the first topic, in position order, that holds the entry. */
  topicId: string;
  /** The first matching segment's original Arabic text. Never altered. */
  preview: string;
  /** Code-unit range in `preview` to highlight, or null when the match cannot be mapped back exactly. */
  highlight: MatchRange | null;
};

/**
 * Hisn duas whose Azkar text segments match the query (ADR 0091). The query and the stored text are both normalised, as
 * in Azkar search; only text segments are searched, so no Quran text is. Each entry appears once, under its first topic
 * in browse order. With no azkar pack, or an empty query, it returns [].
 */
export function searchHisnDuas(db: SqlExecutor, rawQuery: string, limit: number): HisnDuaSearchHit[] {
  const query = normalizeForSearch(rawQuery);
  if (query.length === 0) {
    return [];
  }

  const rows = db.all<{ entryKey: string; topicId: string; textAr: string | null; textSearch: string | null }>(
    `SELECT
       e.entry_key AS entryKey,
       c.id AS topicId,
       s.text_ar AS textAr,
       s.text_search AS textSearch
     FROM azkar_segments s
     JOIN azkar_items i ON i.resource_id = s.resource_id AND i.id = s.item_id
     JOIN azkar_entries e ON e.resource_id = i.resource_id AND e.id = i.entry_id
     JOIN azkar_chapters ch ON ch.resource_id = e.resource_id AND ch.id = e.chapter_id
     JOIN azkar_entry_categories ec ON ec.resource_id = e.resource_id AND ec.entry_id = e.id
     JOIN azkar_categories c ON c.resource_id = ec.resource_id AND c.id = ec.category_id AND c.kind = 'browse'
     WHERE s.resource_id = ? AND s.kind = 'text' AND s.text_search LIKE ? ESCAPE '\\'
       AND ${HISN_ENTRY}
     ORDER BY c.position, c.id, ch.number, e.position, i.position, s.position
     LIMIT ?`,
    [activeAzkarResourceId(db), `%${escapeLike(query)}%`, MAX_HISN_SEGMENT_ROWS],
  );

  const hits: HisnDuaSearchHit[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (hits.length >= limit) {
      break;
    }
    if (seen.has(row.entryKey) || row.textAr === null || row.textSearch === null) {
      continue;
    }
    seen.add(row.entryKey);
    hits.push({
      entryKey: row.entryKey,
      topicId: row.topicId,
      preview: row.textAr,
      highlight: mapMatchToOriginal(row.textAr, row.textSearch, query),
    });
  }
  return hits;
}

export type HisnDuaFavorite = {
  entryKey: string;
  createdAt: number;
  /** The chapter's Arabic title, or null. */
  chapterTitle: string | null;
  /** The recited text of the active variation (never instruction or narration), or null. Never Quran text. */
  preview: string | null;
  /** Every Quran passage of the entry in order (surah and verses only). */
  quranRefs: QuranPreviewRef[];
  bookNumber: string;
  /** The first browse topic that holds the entry, in position order: the Duas topic its name comes from. */
  topicId: string | null;
};

/**
 * The saved Azkar entries that are Hisn duas now, in the order given (newest first when the caller sorts so). An entry
 * that has since left Duas (its `home` changed, or it moved into a session) is skipped here, not deleted from Azkar
 * favourites, which keep every entry.
 */
export function listHisnDuaFavorites(
  db: SqlExecutor,
  favorites: readonly { entryKey: string; createdAt: number }[],
): HisnDuaFavorite[] {
  const isHisnDua = (entryKey: string) =>
    db.get<{ entryKey: string }>(
      `SELECT e.entry_key AS entryKey FROM azkar_entries e
       WHERE e.resource_id = ? AND e.entry_key = ? AND ${HISN_ENTRY}
       LIMIT 1`,
      [activeAzkarResourceId(db), entryKey],
    ) !== undefined;

  const firstTopic = (entryId: number) =>
    db.get<{ topicId: string }>(
      `SELECT c.id AS topicId
       FROM azkar_entry_categories ec
       JOIN azkar_categories c ON c.resource_id = ec.resource_id AND c.id = ec.category_id AND c.kind = 'browse'
       WHERE ec.resource_id = ? AND ec.entry_id = ?
       ORDER BY c.position, c.id
       LIMIT 1`,
      [activeAzkarResourceId(db), entryId],
    )?.topicId ?? null;

  const cards: HisnDuaFavorite[] = [];
  for (const favorite of favorites) {
    if (!isHisnDua(favorite.entryKey)) {
      continue;
    }
    const detail = getEntry(db, favorite.entryKey);
    if (detail === undefined) {
      continue;
    }
    cards.push({
      entryKey: favorite.entryKey,
      createdAt: favorite.createdAt,
      chapterTitle: detail.chapter?.titleAr ?? null,
      preview: recitationPreview(detail.items),
      quranRefs: quranRefs(detail.items),
      bookNumber: detail.entry.sourceReference,
      topicId: firstTopic(detail.entry.id),
    });
  }
  return cards;
}
