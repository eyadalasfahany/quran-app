import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

/**
 * TEST ONLY. Placeholder Azkar rows for the Jest suites. Every text is a marked placeholder («نص تجريبي ... ليس ذكرًا»,
 * `FIXTURE text ... not a dhikr`). They are never a dhikr, never packed, and never loaded by the app: no production
 * code may import this module (ADR 0042, 2 Nov 2026).
 */

/** The `resource_id` the fixtures use. Production has the same value as its "no installed Azkar resource" sentinel. */
export const FIXTURE_RESOURCE_ID = -1;
export const FIXTURE_SOURCE_VERSION = 'taybah-dev-fixture';
const FIXTURE_CHAPTER_TITLE = '[عنوان تجريبي]';
const FIXTURE_SOURCE_NAME = '[مصدر تجريبي]';
const FIXTURE_VARIATION = 'default';
const FIXTURE_IMPORTED_AT = 0;

type FixtureEntry = {
  id: number;
  key: string;
  chapterId: number;
  position: number;
  entryType: 'invocation' | 'instruction' | 'narration';
  occasion: string | null;
  timingType: 'time_period' | 'prayer_based' | 'event_based' | 'anytime';
  timingPrayer: string | null;
};

type FixtureSegment = { text: string | null } | { quran: { surah: number; from: number; to: number | null } };

type FixtureItem = {
  id: number;
  entryId: number;
  key: string;
  position: number;
  kind: 'recitation' | 'instruction' | 'narration';
  requiredCount: number | null;
  textEn: string | null;
  repeatGroup: number | null;
  repeatTimes: number | null;
  /** Upstream alternative. Defaults to FIXTURE_VARIATION; entries with several are alternatives, not sequences. */
  variation?: string;
  segments: FixtureSegment[];
};

const CHAPTERS = [
  { id: 1, sourceChapterId: 'fixture-chapter-1', number: 1, titleEn: 'FIXTURE chapter title 1' },
  { id: 2, sourceChapterId: 'fixture-chapter-2', number: 2, titleEn: 'FIXTURE chapter title 2' },
];

const ENTRIES: FixtureEntry[] = [
  { id: 1, key: 'fixture:entry-001', chapterId: 1, position: 1, entryType: 'invocation', occasion: 'morning', timingType: 'time_period', timingPrayer: null },
  { id: 2, key: 'fixture:entry-002', chapterId: 1, position: 2, entryType: 'invocation', occasion: 'morning', timingType: 'time_period', timingPrayer: null },
  { id: 3, key: 'fixture:entry-003', chapterId: 2, position: 1, entryType: 'invocation', occasion: 'evening', timingType: 'time_period', timingPrayer: null },
  { id: 4, key: 'fixture:entry-004', chapterId: 2, position: 2, entryType: 'instruction', occasion: 'after_prayer', timingType: 'prayer_based', timingPrayer: 'dhuhr' },
  { id: 5, key: 'fixture:entry-005', chapterId: 2, position: 3, entryType: 'invocation', occasion: 'before_sleep', timingType: 'anytime', timingPrayer: null },
  { id: 6, key: 'fixture:entry-006', chapterId: 2, position: 4, entryType: 'narration', occasion: 'after_waking', timingType: 'anytime', timingPrayer: null },
  { id: 7, key: 'fixture:entry-007', chapterId: 2, position: 5, entryType: 'invocation', occasion: 'travel', timingType: 'event_based', timingPrayer: null },
  // Two alternative wordings under one '*' link: the reader shows one; the first in upstream order is the default.
  { id: 8, key: 'fixture:entry-008', chapterId: 2, position: 6, entryType: 'invocation', occasion: 'general', timingType: 'anytime', timingPrayer: null },
];

const ITEMS: FixtureItem[] = [
  // Counts 3 and 33.
  { id: 1, entryId: 1, key: 'fixture:item-001', position: 1, kind: 'recitation', requiredCount: 3, textEn: 'FIXTURE text 1 — not a dhikr', repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ١ — ليس ذكرًا' }] },
  { id: 2, entryId: 1, key: 'fixture:item-002', position: 2, kind: 'recitation', requiredCount: 33, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ٢ — ليس ذكرًا' }] },
  // No sourced count, and a Quran segment pointing to 1:1.
  { id: 3, entryId: 2, key: 'fixture:item-003', position: 1, kind: 'recitation', requiredCount: null, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ٣ — ليس ذكرًا' }, { quran: { surah: 1, from: 1, to: null } }] },
  // One repeat group of two steps, repeated 3 times.
  { id: 4, entryId: 3, key: 'fixture:item-004', position: 1, kind: 'recitation', requiredCount: null, textEn: null, repeatGroup: 1, repeatTimes: 3, segments: [{ text: 'نص تجريبي ٤ — ليس ذكرًا' }] },
  { id: 5, entryId: 3, key: 'fixture:item-005', position: 2, kind: 'recitation', requiredCount: null, textEn: null, repeatGroup: 1, repeatTimes: 3, segments: [{ text: 'نص تجريبي ٥ — ليس ذكرًا' }] },
  // Instruction-only entry.
  { id: 6, entryId: 4, key: 'fixture:item-006', position: 1, kind: 'instruction', requiredCount: null, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'تعليمات تجريبية ١ — ليست ذكرًا' }] },
  // Preface instruction, then a counted step.
  { id: 7, entryId: 5, key: 'fixture:item-007', position: 1, kind: 'instruction', requiredCount: null, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'تعليمات تجريبية ٢ — ليست ذكرًا' }] },
  { id: 8, entryId: 5, key: 'fixture:item-008', position: 2, kind: 'recitation', requiredCount: 7, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ٦ — ليس ذكرًا' }] },
  // A counted step, then an English-only narration (text_ar null).
  { id: 9, entryId: 6, key: 'fixture:item-009', position: 1, kind: 'recitation', requiredCount: 2, textEn: 'FIXTURE text 7 — not a dhikr', repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ٧ — ليس ذكرًا' }] },
  { id: 10, entryId: 6, key: 'fixture:item-010', position: 2, kind: 'narration', requiredCount: null, textEn: 'FIXTURE text 6 — not a dhikr', repeatGroup: null, repeatTimes: null, segments: [{ text: null }] },
  // Carries every note kind.
  { id: 11, entryId: 7, key: 'fixture:item-011', position: 1, kind: 'recitation', requiredCount: 5, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ٨ — ليس ذكرًا' }] },
  // Alternatives of entry 8: 'primary' has the lower item id, so it is the default even though it sorts second.
  { id: 12, entryId: 8, key: 'fixture:item-012', variation: 'primary', position: 1, kind: 'recitation', requiredCount: 3, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ١٠ — ليس ذكرًا' }] },
  { id: 13, entryId: 8, key: 'fixture:item-013', variation: 'alternative', position: 1, kind: 'recitation', requiredCount: 3, textEn: null, repeatGroup: null, repeatTimes: null, segments: [{ text: 'نص تجريبي ١١ — ليس ذكرًا' }] },
];

const NOTES = [
  { id: 1, entryId: 7, kind: 'explanation', textAr: 'ملاحظة تجريبية ١ — ليست شرحًا', grader: null },
  { id: 2, entryId: 7, kind: 'context', textAr: 'ملاحظة تجريبية ٢ — ليست سياقًا', grader: null },
  { id: 3, entryId: 7, kind: 'virtue', textAr: 'ملاحظة تجريبية ٣ — ليست فضلًا', grader: null },
  { id: 4, entryId: 7, kind: 'reference', textAr: 'ملاحظة تجريبية ٤ — ليست مرجعًا', grader: null },
  { id: 5, entryId: 7, kind: 'grade', textAr: 'ملاحظة تجريبية ٥ — ليست حكمًا', grader: 'FIXTURE grader' },
] as const;

const CATEGORIES = [
  { id: 'morning', kind: 'session', position: 1, occasion: 'morning', progressPeriod: 'daily', links: [1, 2] },
  { id: 'evening', kind: 'session', position: 2, occasion: 'evening', progressPeriod: 'daily', links: [3] },
  { id: 'after_prayer', kind: 'session', position: 3, occasion: 'after_prayer', progressPeriod: 'per_prayer', links: [4] },
  { id: 'before_sleep', kind: 'session', position: 4, occasion: 'before_sleep', progressPeriod: 'nightly', links: [5] },
  { id: 'after_waking', kind: 'session', position: 5, occasion: 'after_waking', progressPeriod: 'daily', links: [6] },
  { id: 'food-and-drink', kind: 'browse', position: 1, occasion: null, progressPeriod: 'session', links: [2] },
  { id: 'travel', kind: 'browse', position: 2, occasion: null, progressPeriod: 'session', links: [7] },
  { id: 'home-and-family', kind: 'browse', position: 3, occasion: null, progressPeriod: 'session', links: [3, 8] },
] as const;

/**
 * Replaces the fixture rows in `content.db` (every row with `resource_id = -1`). Idempotent: running it twice
 * leaves one copy of each row.
 */
export function loadAzkarDevFixtures(db: SqlExecutor): void {
  db.transaction(() => {
    clearFixtureRows(db);
    insertChapters(db);
    insertEntries(db);
    insertItems(db);
    insertCategories(db);
    insertNotes(db);
  });
}

function clearFixtureRows(db: SqlExecutor): void {
  for (const table of [
    'azkar_recordings',
    'azkar_notes',
    'azkar_segments',
    'azkar_items',
    'azkar_entry_categories',
    'azkar_entries',
    'azkar_categories',
    'azkar_chapters',
  ]) {
    db.run(`DELETE FROM ${table} WHERE resource_id = ?`, [FIXTURE_RESOURCE_ID]);
  }
}

function insertChapters(db: SqlExecutor): void {
  for (const chapter of CHAPTERS) {
    db.run(
      `INSERT INTO azkar_chapters (resource_id, id, source_chapter_id, number, title_ar, title_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [FIXTURE_RESOURCE_ID, chapter.id, chapter.sourceChapterId, chapter.number, FIXTURE_CHAPTER_TITLE, chapter.titleEn],
    );
  }
}

function insertEntries(db: SqlExecutor): void {
  for (const entry of ENTRIES) {
    db.run(
      `INSERT INTO azkar_entries (
         resource_id, id, entry_key, chapter_id, position, source_reference, entry_type, occasion,
         timing_type, timing_prayer, timing_policy_id, review_status, source_version, imported_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'sourced', ?, ?)`,
      [
        FIXTURE_RESOURCE_ID,
        entry.id,
        entry.key,
        entry.chapterId,
        entry.position,
        `FIXTURE-${String(entry.id).padStart(3, '0')}`,
        entry.entryType,
        entry.occasion,
        entry.timingType,
        entry.timingPrayer,
        FIXTURE_SOURCE_VERSION,
        FIXTURE_IMPORTED_AT,
      ],
    );
  }
}

function insertItems(db: SqlExecutor): void {
  for (const item of ITEMS) {
    db.run(
      `INSERT INTO azkar_items (
         resource_id, id, entry_id, item_key, variation_key, position, kind, required_count,
         speaker, source_dua_id, text_en, transliteration, source_text_sha256, repeat_group, repeat_times
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?, ?)`,
      [
        FIXTURE_RESOURCE_ID,
        item.id,
        item.entryId,
        item.key,
        item.variation ?? FIXTURE_VARIATION,
        item.position,
        item.kind,
        item.requiredCount,
        item.textEn,
        item.repeatGroup,
        item.repeatTimes,
      ],
    );

    item.segments.forEach((segment, index) => {
      const position = index + 1;
      if ('quran' in segment) {
        db.run(
          `INSERT INTO azkar_segments (
             resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search
           ) VALUES (?, ?, ?, 'quran', NULL, ?, ?, ?, NULL)`,
          [FIXTURE_RESOURCE_ID, item.id, position, segment.quran.surah, segment.quran.from, segment.quran.to],
        );
        return;
      }

      db.run(
        `INSERT INTO azkar_segments (
           resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search
         ) VALUES (?, ?, ?, 'text', ?, NULL, NULL, NULL, ?)`,
        [
          FIXTURE_RESOURCE_ID,
          item.id,
          position,
          segment.text,
          segment.text === null ? null : normalizeForSearch(segment.text),
        ],
      );
    });
  }
}

function insertCategories(db: SqlExecutor): void {
  for (const category of CATEGORIES) {
    db.run(
      `INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [FIXTURE_RESOURCE_ID, category.id, category.kind, category.position, category.occasion, category.progressPeriod],
    );

    category.links.forEach((entryId, index) => {
      db.run(
        `INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position)
         VALUES (?, ?, ?, '*', ?)`,
        [FIXTURE_RESOURCE_ID, category.id, entryId, index + 1],
      );
    });
  }
}

function insertNotes(db: SqlExecutor): void {
  for (const note of NOTES) {
    db.run(
      `INSERT INTO azkar_notes (
         resource_id, id, entry_id, item_id, kind, text_ar, text_en, grader,
         source_type, source_name, source_reference, source_url, review_status
       ) VALUES (?, ?, ?, NULL, ?, ?, NULL, ?, 'fixture', ?, NULL, NULL, 'sourced')`,
      [FIXTURE_RESOURCE_ID, note.id, note.entryId, note.kind, note.textAr, note.grader, FIXTURE_SOURCE_NAME],
    );
  }
}
