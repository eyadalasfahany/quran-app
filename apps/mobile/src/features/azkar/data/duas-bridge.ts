import type { SqlExecutor } from '@/core/db/sql-executor';

import { activeAzkarResourceId } from './active-resource';
import { getEntry } from './content-repository';
import { firstArabicText, quranRefs, type QuranPreviewRef } from './preview';

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
      preview: firstArabicText(items),
      quranRefs: quranRefs(items),
      bookNumber: detail.entry.sourceReference,
    });
  }
  return entries;
}
