import type { SqlExecutor } from '@/core/db/sql-executor';
import { getVerseRange, verseKeyToId, type VerseRecord } from '@/features/reader/data/verses';

import { activeDuasResourceId } from './active-resource';
import { hasDuasContent } from './availability';
import { parseDuaHints } from './hints';
import type {
  PropheticDuaDetail,
  PropheticDuaGroup,
  PropheticDuaLink,
  PropheticDuaSection,
  PropheticDuaSummary,
  QuranicDuaDetail,
  QuranicDuaSummary,
} from './model';

export { hasDuasContent };

const QURANIC_SELECT = `
  SELECT
    i.dua_key AS duaKey,
    i.position,
    s.surah,
    s.verse_from AS verseFrom,
    s.verse_to AS verseTo
  FROM dua_items i
  JOIN dua_quran_spans s ON s.resource_id = i.resource_id AND s.item_id = i.id
  WHERE i.resource_id = ? AND i.kind = 'quran'
`;

export function countQuranicDuas(db: SqlExecutor): number {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return 0;
  }

  const row = db.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM dua_items WHERE resource_id = ? AND kind = 'quran'`,
    [resourceId],
  );

  return row?.count ?? 0;
}

export function listQuranicDuas(db: SqlExecutor): QuranicDuaSummary[] {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return [];
  }

  return db.all<QuranicDuaSummary>(
    `${QURANIC_SELECT} ORDER BY s.surah, s.verse_from, i.position`,
    [resourceId],
  );
}

export function getQuranicDua(db: SqlExecutor, duaKey: string): QuranicDuaDetail | undefined {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return undefined;
  }

  const row = db.get<QuranicDuaSummary>(
    `${QURANIC_SELECT} AND i.dua_key = ? LIMIT 1`,
    [resourceId, duaKey],
  );

  if (row === undefined) {
    return undefined;
  }

  const total = countQuranicDuas(db);

  return { ...row, total };
}

/** Resolves a Quranic dua span to verse rows from `verses`. Returns [] when ids are missing. */
export function getQuranicDuaVerses(db: SqlExecutor, dua: Pick<QuranicDuaSummary, 'surah' | 'verseFrom' | 'verseTo'>): VerseRecord[] {
  const from = verseKeyToId(db, `${dua.surah}:${dua.verseFrom}`);
  const to = verseKeyToId(db, `${dua.surah}:${dua.verseTo ?? dua.verseFrom}`);

  if (from === undefined || to === undefined) {
    return [];
  }

  return getVerseRange(db, from, to);
}

const PROPHETIC_SELECT = `
  SELECT
    i.dua_key AS duaKey,
    i.position,
    i.group_id AS groupId,
    h.title
  FROM dua_items i
  JOIN dua_hadith h ON h.resource_id = i.resource_id AND h.item_id = i.id
  WHERE i.resource_id = ? AND i.kind = 'hadith'
`;

export function countPropheticDuas(db: SqlExecutor): number {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return 0;
  }

  const row = db.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM dua_items WHERE resource_id = ? AND kind = 'hadith'`,
    [resourceId],
  );

  return row?.count ?? 0;
}

export function listPropheticDuaSections(db: SqlExecutor): PropheticDuaSection[] {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return [];
  }

  const groups = db.all<PropheticDuaGroup>(
    `SELECT id, title, position FROM dua_groups WHERE resource_id = ? ORDER BY position`,
    [resourceId],
  );

  if (groups.length === 0) {
    const items = db.all<PropheticDuaSummary>(
      `${PROPHETIC_SELECT} ORDER BY i.position`,
      [resourceId],
    );

    return items.length === 0 ? [] : [{ groupId: null, title: null, items }];
  }

  return groups.map((group) => ({
    groupId: group.id,
    title: group.title,
    items: db.all<PropheticDuaSummary>(
      `${PROPHETIC_SELECT} AND i.group_id = ? ORDER BY i.position`,
      [resourceId, group.id],
    ),
  }));
}

type PropheticDetailRow = PropheticDuaSummary & {
  hadeeth: string;
  attribution: string;
  grade: string | null;
  explanation: string | null;
  reference: string | null;
  hints: string | null;
  sourceUrl: string;
};

export function getPropheticDua(db: SqlExecutor, duaKey: string): PropheticDuaDetail | undefined {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return undefined;
  }

  const row = db.get<PropheticDetailRow>(
    `SELECT
      i.dua_key AS duaKey,
      i.position,
      i.group_id AS groupId,
      h.title,
      h.hadeeth,
      h.attribution,
      h.grade,
      h.explanation,
      h.reference,
      h.hints,
      h.source_url AS sourceUrl
    FROM dua_items i
    JOIN dua_hadith h ON h.resource_id = i.resource_id AND h.item_id = i.id
    WHERE i.resource_id = ? AND i.dua_key = ? AND i.kind = 'hadith'
    LIMIT 1`,
    [resourceId, duaKey],
  );

  if (row === undefined) {
    return undefined;
  }

  const total = countPropheticDuas(db);
  const index =
    db.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM dua_items WHERE resource_id = ? AND kind = 'hadith' AND position <= ?`,
      [resourceId, row.position],
    )?.count ?? 0;
  const links = loadPropheticLinks(db, resourceId, row.duaKey);
  const { hints, ...rest } = row;

  return { ...rest, hints: parseDuaHints(hints), index, total, links };
}

function loadPropheticLinks(db: SqlExecutor, resourceId: number, duaKey: string): PropheticDuaLink[] {
  const item = db.get<{ id: number }>(
    `SELECT id FROM dua_items WHERE resource_id = ? AND dua_key = ? LIMIT 1`,
    [resourceId, duaKey],
  );

  if (item === undefined) {
    return [];
  }

  const hisn = db.all<{ entryKey: string }>(
    `SELECT entry_key AS entryKey FROM dua_links WHERE resource_id = ? AND item_id = ?`,
    [resourceId, item.id],
  );

  const refs = db.all<{ collectionSlug: string; hadithNumber: string }>(
    `SELECT collection_slug AS collectionSlug, hadith_number AS hadithNumber
     FROM dua_collection_refs WHERE resource_id = ? AND item_id = ?`,
    [resourceId, item.id],
  );

  return [
    ...hisn.map((link) => ({ kind: 'hisn' as const, entryKey: link.entryKey })),
    ...refs.map((ref) => ({
      kind: 'collection' as const,
      collectionSlug: ref.collectionSlug,
      hadithNumber: ref.hadithNumber,
    })),
  ];
}

export function neighbourPropheticDuas(db: SqlExecutor, position: number): { previous: string | null; next: string | null } {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return { previous: null, next: null };
  }

  const previous = db.get<{ duaKey: string }>(
    `SELECT dua_key AS duaKey FROM dua_items
     WHERE resource_id = ? AND kind = 'hadith' AND position < ?
     ORDER BY position DESC LIMIT 1`,
    [resourceId, position],
  );
  const next = db.get<{ duaKey: string }>(
    `SELECT dua_key AS duaKey FROM dua_items
     WHERE resource_id = ? AND kind = 'hadith' AND position > ?
     ORDER BY position ASC LIMIT 1`,
    [resourceId, position],
  );

  return { previous: previous?.duaKey ?? null, next: next?.duaKey ?? null };
}

export function neighbourQuranicDuas(db: SqlExecutor, position: number): { previous: string | null; next: string | null } {
  const resourceId = activeDuasResourceId(db);

  if (resourceId === -1) {
    return { previous: null, next: null };
  }

  const previous = db.get<{ duaKey: string }>(
    `SELECT dua_key AS duaKey FROM dua_items WHERE resource_id = ? AND kind = 'quran' AND position = ? LIMIT 1`,
    [resourceId, position - 1],
  );
  const next = db.get<{ duaKey: string }>(
    `SELECT dua_key AS duaKey FROM dua_items WHERE resource_id = ? AND kind = 'quran' AND position = ? LIMIT 1`,
    [resourceId, position + 1],
  );

  return { previous: previous?.duaKey ?? null, next: next?.duaKey ?? null };
}
