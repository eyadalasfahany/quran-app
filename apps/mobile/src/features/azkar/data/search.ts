import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { activeAzkarResourceId } from './active-resource';

export const AZKAR_SEARCH_LIMIT = 50;

/** Segment rows read before entries are grouped. A cap keeps a very common query bounded. */
const MAX_SEGMENT_ROWS = 500;

export type AzkarSearchHit = {
  entryKey: string;
  /** The first matching segment's original Arabic text, never altered. */
  preview: string;
  /** Code-unit range in `preview` to highlight, or null when the match cannot be mapped back exactly. */
  highlight: { start: number; end: number } | null;
};

type SearchRow = {
  entryKey: string;
  textAr: string | null;
  textSearch: string | null;
};

/**
 * Entries whose text segments match the query (ADR 0031; Quran segments are never searched). The query and the
 * stored `text_search` are both normalised. Each entry appears once, with its first matching segment.
 */
export function searchAzkarEntries(db: SqlExecutor, rawQuery: string, limit = AZKAR_SEARCH_LIMIT): AzkarSearchHit[] {
  const query = normalizeForSearch(rawQuery);
  if (query.length === 0) {
    return [];
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
     ORDER BY e.entry_key, i.position, s.position
     LIMIT ?`,
    [activeAzkarResourceId(db), `%${escapeLike(query)}%`, MAX_SEGMENT_ROWS],
  );

  const hits: AzkarSearchHit[] = [];
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
      preview: row.textAr,
      highlight: mapMatchToOriginal(row.textAr, row.textSearch, query),
    });
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
