import type { SqlExecutor } from '@/core/db/sql-executor';
import { listHisnDuaEntries, listHisnDuaTopics, type QuranPreviewRef } from '@/features/azkar/data';

import { activeDuasResourceId } from './active-resource';
import { listPropheticDuasInGroup, listQuranicDuas } from './content-repository';
import type { DuaCategory, DuaCategoryItem } from './model';

/**
 * Duas categories (ADR 0091). Three kinds, in this order: the Quranic duas (one category), each HadeethEnc dua group
 * (its title as received), and each Azkar browse topic that holds a Hisn dua. A category with no items is never
 * listed, so no category is a dead end. A missing pack contributes nothing.
 */

export const QURAN_DUA_CATEGORY_ID = 'quran';
const HADEETHENC_PREFIX = 'hadeethenc:';
const HISN_PREFIX = 'hisn:';

export type ParsedDuaCategoryId =
  | { kind: 'quran' }
  | { kind: 'hadeethenc'; groupId: number }
  | { kind: 'hisn'; topicId: string };

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
  return null;
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

/** Every non-empty Duas category, in display order: Quran, HadeethEnc groups, then Hisn topics. */
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
