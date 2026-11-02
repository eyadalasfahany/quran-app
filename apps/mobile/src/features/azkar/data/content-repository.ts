import {
  azkarCategoryKinds,
  azkarEntryTypes,
  azkarItemKinds,
  azkarNoteKinds,
  azkarOccasions,
  azkarProgressPeriods,
  azkarReviewStatuses,
  azkarSegmentKinds,
  azkarTimingPrayers,
  azkarTimingTypes,
} from '@/core/db/content/schema';
import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Locale } from '@/core/i18n/locale';
import { getVerseRange, verseKeyToId, type VerseRecord } from '@/features/reader/data/verses';

import { activeAzkarResourceId } from './active-resource';
import { buildCategoryUnits, type ReaderUnit } from './reader-units';
import {
  asAzkarEnum,
  type AzkarCategory,
  type AzkarCategoryEntry,
  type AzkarCategoryListItem,
  type AzkarChapter,
  type AzkarEntry,
  type AzkarEntryDetail,
  type AzkarItem,
  type AzkarItemDetail,
  type AzkarNote,
  type AzkarNoteKind,
  type AzkarRecording,
  type AzkarSegment,
  type AzkarVariation,
} from './model';

/**
 * Reads the azkar tables of `content.db` (ADR 0031). Quran text is never read from these tables: a `quran`
 * segment resolves to Taybah's `verses` through `getQuranSegmentVerses`.
 */

const ALL_VARIATIONS = '*';

const CATEGORY_SELECT = `
  SELECT
    resource_id AS resourceId,
    id,
    kind,
    position,
    occasion,
    progress_period AS progressPeriod
  FROM azkar_categories
`;

const CHAPTER_SELECT = `
  SELECT
    resource_id AS resourceId,
    id,
    source_chapter_id AS sourceChapterId,
    number,
    title_ar AS titleAr,
    title_en AS titleEn
  FROM azkar_chapters
`;

const ENTRY_SELECT = `
  SELECT
    resource_id AS resourceId,
    id,
    entry_key AS entryKey,
    chapter_id AS chapterId,
    position,
    source_reference AS sourceReference,
    entry_type AS entryType,
    occasion,
    timing_type AS timingType,
    timing_prayer AS timingPrayer,
    review_status AS reviewStatus,
    source_version AS sourceVersion,
    imported_at AS importedAt
  FROM azkar_entries
`;

/** The entry columns, qualified for a join on `azkar_entries e` (the same aliases as `ENTRY_SELECT`). */
const JOINED_ENTRY_COLUMNS = `
    e.resource_id AS resourceId,
    e.id AS id,
    e.entry_key AS entryKey,
    e.chapter_id AS chapterId,
    e.position AS position,
    e.source_reference AS sourceReference,
    e.entry_type AS entryType,
    e.occasion AS occasion,
    e.timing_type AS timingType,
    e.timing_prayer AS timingPrayer,
    e.review_status AS reviewStatus,
    e.source_version AS sourceVersion,
    e.imported_at AS importedAt`;

const ITEM_SELECT = `
  SELECT
    resource_id AS resourceId,
    id,
    entry_id AS entryId,
    item_key AS itemKey,
    variation_key AS variationKey,
    position,
    kind,
    required_count AS requiredCount,
    speaker,
    source_dua_id AS sourceDuaId,
    text_en AS textEn,
    transliteration,
    repeat_group AS repeatGroup,
    repeat_times AS repeatTimes
  FROM azkar_items
`;

const SEGMENT_SELECT = `
  SELECT
    s.resource_id AS resourceId,
    s.item_id AS itemId,
    s.position AS position,
    s.kind AS kind,
    s.text_ar AS textAr,
    s.quran_surah AS quranSurah,
    s.quran_verse_from AS quranVerseFrom,
    s.quran_verse_to AS quranVerseTo,
    s.text_search AS textSearch
  FROM azkar_segments s
`;

const NOTE_SELECT = `
  SELECT
    resource_id AS resourceId,
    id,
    entry_id AS entryId,
    item_id AS itemId,
    kind,
    text_ar AS textAr,
    text_en AS textEn,
    grader,
    source_type AS sourceType,
    source_name AS sourceName,
    source_reference AS sourceReference,
    source_url AS sourceUrl,
    review_status AS reviewStatus
  FROM azkar_notes
`;

const RECORDING_SELECT = `
  SELECT
    r.resource_id AS resourceId,
    r.id AS id,
    r.recording_key AS recordingKey,
    r.item_id AS itemId,
    r.reciter_name AS reciterName,
    r.reciter_name_ar AS reciterNameAr,
    r.source AS source,
    r.remote_url AS remoteUrl,
    r.duration_ms AS durationMs,
    r.size_bytes AS sizeBytes,
    r.stream_allowed AS streamAllowed,
    r.download_allowed AS downloadAllowed,
    r.redistribution_allowed AS redistributionAllowed,
    r.attribution_ar AS attributionAr,
    r.attribution_en AS attributionEn,
    r.licence AS licence,
    r.licence_url AS licenceUrl,
    r.rights_verified_at AS rightsVerifiedAt
  FROM azkar_recordings r
`;

type CategoryRow = Omit<AzkarCategory, 'kind' | 'occasion' | 'progressPeriod'> & {
  kind: string;
  occasion: string | null;
  progressPeriod: string;
};

type ChapterRow = AzkarChapter;

type EntryRow = Omit<AzkarEntry, 'entryType' | 'occasion' | 'timingType' | 'timingPrayer' | 'reviewStatus'> & {
  entryType: string;
  occasion: string | null;
  timingType: string | null;
  timingPrayer: string | null;
  reviewStatus: string;
};

type ItemRow = Omit<AzkarItem, 'kind'> & { kind: string };

type SegmentRow = Omit<AzkarSegment, 'kind'> & { kind: string };

type NoteRow = Omit<AzkarNote, 'kind' | 'reviewStatus'> & { kind: string; reviewStatus: string };

type RecordingRow = Omit<AzkarRecording, 'streamAllowed' | 'downloadAllowed' | 'redistributionAllowed'> & {
  streamAllowed: number;
  downloadAllowed: number;
  redistributionAllowed: number;
};

/** A category link joined to its entry: the entry columns (`EntryRow`) plus the link's variation and chapter number. */
type CategoryLinkRow = { chapterNumber: number; linkVariationKey: string };

export function hasAzkarContent(db: SqlExecutor): boolean {
  return db.get<{ one: number }>('SELECT 1 AS one FROM azkar_entries WHERE resource_id = ? LIMIT 1', [activeAzkarResourceId(db)]) !== undefined;
}

/** Session categories first, then browse; each in its stored position. `unitCount` is built for `locale`. */
export function listCategories(db: SqlExecutor, locale: Locale = 'ar'): AzkarCategoryListItem[] {
  const rows = db.all<CategoryRow>(
    `${CATEGORY_SELECT} WHERE resource_id = ? ORDER BY CASE kind WHEN 'session' THEN 0 ELSE 1 END, position, id`,
    [activeAzkarResourceId(db)],
  );

  return rows.map((row) => {
    const category = asCategory(row);
    return { ...category, unitCount: listCategoryUnits(db, category.id, locale).length };
  });
}

/** Category ids in display order, without building units (cheap enough to run per keystroke). */
export function listCategoryIds(db: SqlExecutor): string[] {
  return db
    .all<{ id: string }>(
      `SELECT DISTINCT id FROM azkar_categories WHERE resource_id = ? ORDER BY CASE kind WHEN 'session' THEN 0 ELSE 1 END, position, id`,
      [activeAzkarResourceId(db)],
    )
    .map((row) => row.id);
}

export function getCategory(db: SqlExecutor, categoryId: string): AzkarCategory | undefined {
  const row = db.get<CategoryRow>(`${CATEGORY_SELECT} WHERE resource_id = ? AND id = ?`, [activeAzkarResourceId(db), categoryId]);
  return row === undefined ? undefined : asCategory(row);
}

/** The reader's chosen alternative per entry key (see `variation-choice.ts`). Unknown keys are ignored. */
export type VariationOverrides = Readonly<Record<string, string>>;

/**
 * Entries of a category in chapter order, then entry position. A link with a specific `variation_key` uses exactly
 * that variation. A `'*'` link uses ONE of the entry's alternatives: the override when it names one, else the first
 * alternative in upstream order. Alternatives are never concatenated.
 */
export function listCategoryEntries(
  db: SqlExecutor,
  categoryId: string,
  overrides: VariationOverrides = {},
): AzkarCategoryEntry[] {
  // One join reads the links with their entries and chapters, so no entry is fetched on its own.
  const links = db.all<EntryRow & CategoryLinkRow>(
    `SELECT ${JOINED_ENTRY_COLUMNS},
       ec.variation_key AS linkVariationKey,
       c.number AS chapterNumber
     FROM azkar_entry_categories ec
     JOIN azkar_entries e ON e.resource_id = ec.resource_id AND e.id = ec.entry_id
     JOIN azkar_chapters c ON c.resource_id = e.resource_id AND c.id = e.chapter_id
     WHERE ec.resource_id = ? AND ec.category_id = ?
     ORDER BY c.number, e.position, e.id`,
    [activeAzkarResourceId(db), categoryId],
  );

  const entries = links.map((link) => ({ link, entry: asEntry(link) }));
  // The items of every entry in two queries, not two per entry.
  const itemsByEntry = loadItemsByEntry(
    db,
    entries.map(({ entry }) => entry),
  );

  return entries.map(({ link, entry }) => {
    const selection = selectEntry(itemsByEntry.get(entryMapKey(entry)) ?? [], {
      entry,
      linkVariationKey: link.linkVariationKey,
      requested: overrides[entry.entryKey],
    });
    return {
      entry,
      chapterNumber: link.chapterNumber,
      variationKey: link.linkVariationKey,
      variations: selection.variations,
      activeVariation: selection.activeVariation,
      items: selection.items,
    };
  });
}

/** The reader units of a category, in entry order. Each entry counts once, through its active variation. */
export function listCategoryUnits(
  db: SqlExecutor,
  categoryId: string,
  locale: Locale,
  overrides: VariationOverrides = {},
): ReaderUnit[] {
  return buildCategoryUnits(
    listCategoryEntries(db, categoryId, overrides).map((entry) => ({
      entryKey: entry.entry.entryKey,
      items: entry.items,
      variations: entry.variations,
      activeVariation: entry.activeVariation,
    })),
    locale,
  );
}

/**
 * One entry for the detail view. Its items are the active alternative's; `variations` lists every alternative, so the
 * reader can switch. `overrides` is keyed by entry key, like the category readers.
 */
export function getEntry(
  db: SqlExecutor,
  entryKey: string,
  overrides: VariationOverrides = {},
): AzkarEntryDetail | undefined {
  const row = db.get<EntryRow>(`${ENTRY_SELECT} WHERE resource_id = ? AND entry_key = ?`, [activeAzkarResourceId(db), entryKey]);
  if (row === undefined) {
    return undefined;
  }

  const entry = asEntry(row);
  const items = loadItemsByEntry(db, [entry]).get(entryMapKey(entry)) ?? [];
  const selection = selectEntry(items, { entry, linkVariationKey: null, requested: overrides[entry.entryKey] });
  const chapterRow = db.get<ChapterRow>(`${CHAPTER_SELECT} WHERE resource_id = ? AND id = ?`, [
    entry.resourceId,
    entry.chapterId,
  ]);

  return {
    entry,
    chapter: chapterRow === undefined ? null : chapterRow,
    variations: selection.variations,
    activeVariation: selection.activeVariation,
    items: selection.items,
    notes: loadNotes(db, entry.resourceId, entry.id),
    recordings: loadRecordings(db, entry.resourceId, entry.id),
  };
}

/**
 * The verses of a `quran` segment, from Taybah's `verses` table (ADR 0031 §4). Returns [] when the segment is not a
 * Quran segment or its reference does not resolve.
 */
export function getQuranSegmentVerses(
  db: SqlExecutor,
  segment: Pick<AzkarSegment, 'kind' | 'quranSurah' | 'quranVerseFrom' | 'quranVerseTo'>,
): VerseRecord[] {
  if (segment.kind !== 'quran' || segment.quranSurah === null || segment.quranVerseFrom === null) {
    return [];
  }

  const from = verseKeyToId(db, `${segment.quranSurah}:${segment.quranVerseFrom}`);
  const to = verseKeyToId(db, `${segment.quranSurah}:${segment.quranVerseTo ?? segment.quranVerseFrom}`);
  if (from === undefined || to === undefined) {
    return [];
  }

  return getVerseRange(db, from, to);
}

/** One entry's alternative choice, as the reader needs it: the requested or first alternative, or a fixed link's. */
type EntrySelection = { variations: AzkarVariation[]; activeVariation: string; items: AzkarItemDetail[] };

/** An entry and what its link asks for. `linkVariationKey` null is the detail view (every alternative offered). */
type EntryRequest = { entry: AzkarEntry; linkVariationKey: string | null; requested: string | undefined };

/** Items with their segments, keyed by `entryMapKey`, for many entries at once. */
type ItemsByEntry = Map<string, AzkarItemDetail[]>;

const ENTRY_QUERY_CHUNK = 400;

function entryMapKey(entry: Pick<AzkarEntry, 'resourceId' | 'id'>): string {
  return `${entry.resourceId}:${entry.id}`;
}

/**
 * The items (with their segments) of many entries, read in one query per chunk of entries rather than two per entry.
 * Items come back in `variation_key, position, id` order and segments in `item_id, position` order, so every entry's
 * list keeps the order a single-entry read gives.
 */
function loadItemsByEntry(db: SqlExecutor, entries: readonly Pick<AzkarEntry, 'resourceId' | 'id'>[]): ItemsByEntry {
  const byEntry: ItemsByEntry = new Map();
  const idsByResource = new Map<number, number[]>();
  for (const entry of entries) {
    const ids = idsByResource.get(entry.resourceId) ?? [];
    ids.push(entry.id);
    idsByResource.set(entry.resourceId, ids);
  }

  for (const [resourceId, allIds] of idsByResource) {
    for (let start = 0; start < allIds.length; start += ENTRY_QUERY_CHUNK) {
      const ids = allIds.slice(start, start + ENTRY_QUERY_CHUNK);
      const marks = ids.map(() => '?').join(', ');
      const items = db.all<ItemRow>(
        `${ITEM_SELECT} WHERE resource_id = ? AND entry_id IN (${marks}) ORDER BY entry_id, variation_key, position, id`,
        [resourceId, ...ids],
      );
      if (items.length === 0) {
        continue;
      }

      const segments = db.all<SegmentRow>(
        `${SEGMENT_SELECT}
         JOIN azkar_items i ON i.resource_id = s.resource_id AND i.id = s.item_id
         WHERE i.resource_id = ? AND i.entry_id IN (${marks})
         ORDER BY s.item_id, s.position`,
        [resourceId, ...ids],
      );

      const segmentsByItem = new Map<number, AzkarSegment[]>();
      for (const row of segments) {
        const list = segmentsByItem.get(row.itemId) ?? [];
        list.push(asSegment(row));
        segmentsByItem.set(row.itemId, list);
      }

      for (const row of items) {
        const key = entryMapKey({ resourceId: row.resourceId, id: row.entryId });
        const list = byEntry.get(key) ?? [];
        list.push({ ...asItem(row), segments: segmentsByItem.get(row.id) ?? [] });
        byEntry.set(key, list);
      }
    }
  }

  return byEntry;
}

/**
 * Every alternative of an entry, in upstream order: the lowest item id first. `labelIndex` is 1-based. `items` are the
 * entry's items of every variation.
 */
function alternativesOf(items: readonly AzkarItemDetail[]): { key: string; minId: number }[] {
  const firstIds = new Map<string, number>();
  for (const item of items) {
    const current = firstIds.get(item.variationKey);
    if (current === undefined || item.id < current) {
      firstIds.set(item.variationKey, item.id);
    }
  }
  return [...firstIds].sort((a, b) => a[1] - b[1]).map(([key, minId]) => ({ key, minId }));
}

/**
 * The alternative an entry shows. A link with a specific variation fixes it (no switching, `variations` empty). A `'*'`
 * link, or no link (the detail view), offers every alternative and uses the requested one when it exists, else the
 * first in upstream order. Works on the items already loaded for the entry (see `loadItemsByEntry`).
 */
function selectEntry(items: readonly AzkarItemDetail[], request: EntryRequest): EntrySelection {
  const { linkVariationKey, requested } = request;
  if (linkVariationKey !== null && linkVariationKey !== ALL_VARIATIONS) {
    return {
      variations: [],
      activeVariation: linkVariationKey,
      items: items.filter((item) => item.variationKey === linkVariationKey),
    };
  }

  const alternatives = alternativesOf(items);
  const chosen = alternatives.find((alternative) => alternative.key === requested) ?? alternatives[0];
  const variations: AzkarVariation[] = alternatives.map((alternative, index) => ({
    key: alternative.key,
    labelIndex: index + 1,
    labelEn: null,
  }));
  if (chosen === undefined) {
    return { variations, activeVariation: ALL_VARIATIONS, items: [] };
  }

  return {
    variations,
    activeVariation: chosen.key,
    items: items.filter((item) => item.variationKey === chosen.key),
  };
}

function loadNotes(db: SqlExecutor, resourceId: number, entryId: number): Record<AzkarNoteKind, AzkarNote[]> {
  const grouped: Record<AzkarNoteKind, AzkarNote[]> = {
    explanation: [],
    context: [],
    virtue: [],
    reference: [],
    grade: [],
  };

  const rows = db.all<NoteRow>(`${NOTE_SELECT} WHERE resource_id = ? AND entry_id = ? ORDER BY id`, [resourceId, entryId]);
  for (const row of rows) {
    const note = asNote(row);
    grouped[note.kind].push(note);
  }

  return grouped;
}

/**
 * The recordings attached to the given items, in item order. A category reader uses it once for every unit's items,
 * so it reads the recordings of a whole category in one query instead of one entry at a time (ADR 0031 §8).
 */
export function listRecordingsForItems(db: SqlExecutor, itemIds: readonly number[]): AzkarRecording[] {
  if (itemIds.length === 0) {
    return [];
  }
  const placeholders = itemIds.map(() => '?').join(', ');
  return db
    .all<RecordingRow>(
      `${RECORDING_SELECT}
       JOIN azkar_items i ON i.resource_id = r.resource_id AND i.id = r.item_id
       WHERE i.resource_id = ? AND i.id IN (${placeholders})
       ORDER BY i.position, r.id`,
      [activeAzkarResourceId(db), ...itemIds],
    )
    .map(asRecording);
}

function loadRecordings(db: SqlExecutor, resourceId: number, entryId: number): AzkarRecording[] {
  return db
    .all<RecordingRow>(
      `${RECORDING_SELECT}
       JOIN azkar_items i ON i.resource_id = r.resource_id AND i.id = r.item_id
       WHERE i.resource_id = ? AND i.entry_id = ?
       ORDER BY i.position, r.id`,
      [resourceId, entryId],
    )
    .map(asRecording);
}

function asCategory(row: CategoryRow): AzkarCategory {
  return {
    resourceId: row.resourceId,
    id: row.id,
    kind: asAzkarEnum(azkarCategoryKinds, row.kind, 'category kind'),
    position: row.position,
    occasion: nullableEnum(azkarOccasions, row.occasion, 'occasion'),
    progressPeriod: asAzkarEnum(azkarProgressPeriods, row.progressPeriod, 'progress period'),
  };
}

function asEntry(row: EntryRow): AzkarEntry {
  return {
    resourceId: row.resourceId,
    id: row.id,
    entryKey: row.entryKey,
    chapterId: row.chapterId,
    position: row.position,
    sourceReference: row.sourceReference,
    entryType: asAzkarEnum(azkarEntryTypes, row.entryType, 'entry type'),
    occasion: nullableEnum(azkarOccasions, row.occasion, 'occasion'),
    timingType: nullableEnum(azkarTimingTypes, row.timingType, 'timing type'),
    timingPrayer: nullableEnum(azkarTimingPrayers, row.timingPrayer, 'timing prayer'),
    reviewStatus: asAzkarEnum(azkarReviewStatuses, row.reviewStatus, 'review status'),
    sourceVersion: row.sourceVersion,
    importedAt: row.importedAt,
  };
}

function asItem(row: ItemRow): AzkarItem {
  return {
    resourceId: row.resourceId,
    id: row.id,
    entryId: row.entryId,
    itemKey: row.itemKey,
    variationKey: row.variationKey,
    position: row.position,
    kind: asAzkarEnum(azkarItemKinds, row.kind, 'item kind'),
    requiredCount: row.requiredCount,
    speaker: row.speaker,
    sourceDuaId: row.sourceDuaId,
    textEn: row.textEn,
    transliteration: row.transliteration,
    repeatGroup: row.repeatGroup,
    repeatTimes: row.repeatTimes,
  };
}

function asSegment(row: SegmentRow): AzkarSegment {
  return {
    resourceId: row.resourceId,
    itemId: row.itemId,
    position: row.position,
    kind: asAzkarEnum(azkarSegmentKinds, row.kind, 'segment kind'),
    textAr: row.textAr,
    quranSurah: row.quranSurah,
    quranVerseFrom: row.quranVerseFrom,
    quranVerseTo: row.quranVerseTo,
    textSearch: row.textSearch,
  };
}

function asNote(row: NoteRow): AzkarNote {
  return {
    resourceId: row.resourceId,
    id: row.id,
    entryId: row.entryId,
    itemId: row.itemId,
    kind: asAzkarEnum(azkarNoteKinds, row.kind, 'note kind'),
    textAr: row.textAr,
    textEn: row.textEn,
    grader: row.grader,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    sourceReference: row.sourceReference,
    sourceUrl: row.sourceUrl,
    reviewStatus: asAzkarEnum(azkarReviewStatuses, row.reviewStatus, 'review status'),
  };
}

function asRecording(row: RecordingRow): AzkarRecording {
  return {
    ...row,
    streamAllowed: row.streamAllowed === 1,
    downloadAllowed: row.downloadAllowed === 1,
    redistributionAllowed: row.redistributionAllowed === 1,
  };
}

function nullableEnum<const T extends readonly string[]>(values: T, value: string | null, field: string): T[number] | null {
  return value === null ? null : asAzkarEnum(values, value, field);
}
