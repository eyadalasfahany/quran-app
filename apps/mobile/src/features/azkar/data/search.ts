import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { activeAzkarResourceId } from './active-resource';

export const AZKAR_SEARCH_LIMIT = 50;

/** Segment rows read before entries are grouped. A cap keeps a very common query bounded. */
const MAX_SEGMENT_ROWS = 500;

/**
 * An entry search may return (ADR 0091): every entry, except one moved to Duas (`home = 'duas'`) that no session lists.
 * The entry's alias is `e`. A session dua stays searchable, because it is still shown in its session.
 */
const SEARCHABLE_ENTRY = `(e.home IS NULL OR EXISTS (
  SELECT 1 FROM azkar_entry_categories sec
  JOIN azkar_categories sc ON sc.resource_id = sec.resource_id AND sc.id = sec.category_id
  WHERE sec.resource_id = e.resource_id AND sec.entry_id = e.id AND sc.kind = 'session'))`;

export type AzkarSearchHit = {
  entryKey: string;
  /** The first matching segment's original Arabic text (or, for a chapter-title hit, the entry's first text), never altered. */
  preview: string;
  /** Code-unit range in `preview` to highlight, or null when the match cannot be mapped back exactly or is a title hit. */
  highlight: { start: number; end: number } | null;
};

type SearchRow = {
  entryKey: string;
  textAr: string | null;
  textSearch: string | null;
};

type ChapterTitleRow = {
  id: number;
  titleAr: string;
};

type ChapterEntryTextRow = {
  entryKey: string;
  chapterId: number;
  textAr: string;
};

/**
 * Entries whose chapter title or text segments match the query (ADR 0031; Quran segments are never searched). The
 * query and the stored text are both normalised. Entries whose chapter title matches come first, in chapter number then
 * entry order, each with its first Arabic text as the preview. Then the entries whose text matches, each once.
 */
export function searchAzkarEntries(db: SqlExecutor, rawQuery: string, limit = AZKAR_SEARCH_LIMIT): AzkarSearchHit[] {
  const query = normalizeForSearch(rawQuery);
  if (query.length === 0) {
    return [];
  }

  const resourceId = activeAzkarResourceId(db);
  const hits: AzkarSearchHit[] = [];
  const seen = new Set<string>();

  for (const hit of searchChapterTitles(db, resourceId, query)) {
    if (hits.length >= limit) {
      return hits;
    }
    seen.add(hit.entryKey);
    hits.push(hit);
  }

  const rows = db.all<SearchRow>(
    `SELECT
       e.entry_key AS entryKey,
       s.text_ar AS textAr,
       s.text_search AS textSearch
     FROM azkar_segments s
     JOIN azkar_items i ON i.resource_id = s.resource_id AND i.id = s.item_id
     JOIN azkar_entries e ON e.resource_id = i.resource_id AND e.id = i.entry_id
     WHERE s.resource_id = ? AND s.kind = 'text' AND s.text_search LIKE ? ESCAPE '\\'
       AND ${SEARCHABLE_ENTRY}
     ORDER BY e.entry_key, i.position, s.position
     LIMIT ?`,
    [resourceId, `%${escapeLike(query)}%`, MAX_SEGMENT_ROWS],
  );

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
      preview: row.textAr,
      highlight: mapMatchToOriginal(row.textAr, row.textSearch, query),
    });
  }

  return hits;
}

/**
 * Entries of the chapters whose normalised title contains the normalised query, in chapter number then entry order.
 * Each gets its first non-empty Arabic text segment as the preview; an entry with no such text is skipped.
 */
function searchChapterTitles(db: SqlExecutor, resourceId: number, query: string): AzkarSearchHit[] {
  const chapters = db.all<ChapterTitleRow>(
    `SELECT id, title_ar AS titleAr FROM azkar_chapters WHERE resource_id = ? ORDER BY number, id`,
    [resourceId],
  );
  const chapterIds = chapters.filter((chapter) => normalizeForSearch(chapter.titleAr).includes(query)).map((chapter) => chapter.id);
  if (chapterIds.length === 0) {
    return [];
  }

  const rows = db.all<ChapterEntryTextRow>(
    `SELECT
       e.entry_key AS entryKey,
       e.chapter_id AS chapterId,
       s.text_ar AS textAr
     FROM azkar_entries e
     JOIN azkar_chapters c ON c.resource_id = e.resource_id AND c.id = e.chapter_id
     JOIN azkar_items i ON i.resource_id = e.resource_id AND i.entry_id = e.id
     JOIN azkar_segments s ON s.resource_id = i.resource_id AND s.item_id = i.id
     WHERE e.resource_id = ?
       AND e.chapter_id IN (${chapterIds.map(() => '?').join(', ')})
       AND ${SEARCHABLE_ENTRY}
       AND s.kind = 'text' AND s.text_ar IS NOT NULL AND s.text_ar <> ''
     ORDER BY c.number, e.position, i.position, i.id, s.position`,
    [resourceId, ...chapterIds],
  );

  const hits: AzkarSearchHit[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.entryKey)) {
      continue;
    }
    seen.add(row.entryKey);
    hits.push({ entryKey: row.entryKey, preview: row.textAr, highlight: null });
  }
  return hits;
}

/** Whether a localised category label matches the query, using the same normalisation. */
export function matchesCategoryLabel(rawQuery: string, label: string): boolean {
  const query = normalizeForSearch(rawQuery);
  return query.length > 0 && normalizeForSearch(label).includes(query);
}

/**
 * Maps the normalised match back onto the original string. Returns null when the normalised range does not
 * correspond exactly to a span of the original (the caller then highlights nothing).
 */
export function mapMatchToOriginal(
  original: string,
  normalizedText: string,
  normalizedQuery: string,
): { start: number; end: number } | null {
  const matchAt = normalizedText.indexOf(normalizedQuery);
  if (matchAt < 0) {
    return null;
  }
  const matchEnd = matchAt + normalizedQuery.length;

  let start = -1;
  let end = -1;
  for (let cut = 0; cut <= original.length; cut += 1) {
    const length = normalizeForSearch(original.slice(0, cut)).length;
    if (start < 0 && length > matchAt) {
      start = cut - 1;
    }
    if (end < 0 && length >= matchEnd) {
      end = cut;
      break;
    }
  }

  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  return normalizeForSearch(original.slice(start, end)) === normalizedQuery ? { start, end } : null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
