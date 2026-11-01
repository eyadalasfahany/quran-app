import type { SqlExecutor } from '@/core/db/sql-executor';

import { getQuranSegmentVerses } from './content-repository';
import type { AzkarSegment } from './model';

/**
 * The resolved Quran text of a unit's `quran` segments. Quran comes from Taybah's `verses` (ADR 0031 §4), never from the
 * azkar tables, and it is passed on exactly as stored: `text_uthmani` is never trimmed, normalised or re-encoded.
 */

/** A segment's key: an azkar segment is unique by its item and its position within the item. */
export function quranSegmentKey(segment: Pick<AzkarSegment, 'itemId' | 'position'>): string {
  return `${segment.itemId}:${segment.position}`;
}

/**
 * The verse texts of every `quran` segment in `items`, read from `verses` once, so the reader resolves a unit when it
 * changes, not on every render. Keyed by `quranSegmentKey`. A segment that does not resolve maps to an empty list.
 */
export function resolveQuranVerses(
  db: SqlExecutor,
  items: readonly { segments: readonly AzkarSegment[] }[],
): ReadonlyMap<string, readonly string[]> {
  const resolved = new Map<string, readonly string[]>();
  for (const item of items) {
    for (const segment of item.segments) {
      if (segment.kind !== 'quran') {
        continue;
      }
      resolved.set(
        quranSegmentKey(segment),
        getQuranSegmentVerses(db, segment).map((verse) => verse.textUthmani),
      );
    }
  }
  return resolved;
}
