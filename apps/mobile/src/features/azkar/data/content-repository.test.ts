import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { activeAzkarResourceId } from './active-resource';
import {
  getCategory,
  getEntry,
  getQuranSegmentVerses,
  hasAzkarContent,
  listCategories,
  listCategoryEntries,
  listCategoryIds,
  listCategoryUnits,
} from './content-repository';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { searchAzkarEntries } from './search';

// Verse rows are placeholders: the real Quran text comes from the Tanzil seed, never from these tests.
function insertPlaceholderVerses(database: DatabaseSync): void {
  const insert = database.prepare(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
     VALUES (?, ?, 1, ?, 1, 1, 1, 1, 'none', ?, ?)`,
  );
  insert.run(1, '1:1', 1, 'FIXTURE VERSE 1:1', 'fixture verse 1 1');
  insert.run(2, '1:2', 2, 'FIXTURE VERSE 1:2', 'fixture verse 1 2');
}

describe('azkar content repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    insertPlaceholderVerses(database);
  });

  afterEach(() => {
    database.close();
  });

  it('reports no content until an entry exists', () => {
    expect(hasAzkarContent(executor)).toBe(false);

    loadAzkarDevFixtures(executor);
    expect(hasAzkarContent(executor)).toBe(true);
  });

  it('lists session categories first, each with its reader-unit count', () => {
    loadAzkarDevFixtures(executor);

    const categories = listCategories(executor, 'ar');
    expect(categories.map((category) => [category.id, category.unitCount])).toEqual([
      ['morning', 3],
      ['evening', 1],
      ['after_prayer', 1],
      ['before_sleep', 1],
      ['after_waking', 1],
      ['food-and-drink', 1],
      ['travel', 1],
      ['home-and-family', 2],
    ]);
    expect(at(categories, 0)).toMatchObject({ kind: 'session', progressPeriod: 'daily', occasion: 'morning' });
  });

  it('builds the morning units in entry order with sourced counts only', () => {
    loadAzkarDevFixtures(executor);

    const units = listCategoryUnits(executor, 'morning', 'ar');
    expect(units.map((unit) => [unit.unitKey, unit.requiredCount])).toEqual([
      ['fixture:item-001', 3],
      ['fixture:item-002', 33],
      ['fixture:item-003', null],
    ]);
  });

  it('keeps English-only steps for English only', () => {
    loadAzkarDevFixtures(executor);

    const arabic = listCategoryUnits(executor, 'after_waking', 'ar');
    const english = listCategoryUnits(executor, 'after_waking', 'en');

    expect(at(arabic, 0).afterword).toEqual([]);
    expect(at(english, 0).afterword.map((step) => step.itemKey)).toEqual(['fixture:item-010']);
  });

  it('turns a preface instruction and a repeat group into the expected units', () => {
    loadAzkarDevFixtures(executor);

    const beforeSleep = listCategoryUnits(executor, 'before_sleep', 'ar');
    expect(beforeSleep).toHaveLength(1);
    expect(at(beforeSleep, 0)).toMatchObject({ requiredCount: 7, kind: 'recitation' });
    expect(at(beforeSleep, 0).preface.map((step) => step.kind)).toEqual(['instruction']);

    const evening = listCategoryUnits(executor, 'evening', 'ar');
    expect(at(evening, 0)).toMatchObject({ unitKey: 'fixture:entry-003:default:g1', requiredCount: 3 });
    expect(at(evening, 0).body.map((step) => step.itemKey)).toEqual(['fixture:item-004', 'fixture:item-005']);
  });

  it('turns an instruction-only entry into one read unit with no count', () => {
    loadAzkarDevFixtures(executor);

    const afterPrayer = listCategoryUnits(executor, 'after_prayer', 'ar');
    expect(afterPrayer).toEqual([
      expect.objectContaining({ unitKey: 'fixture:entry-004:default:read', kind: 'read', requiredCount: null }),
    ]);
  });

  it('orders category entries by chapter number, then entry position', () => {
    loadAzkarDevFixtures(executor);

    const entries = listCategoryEntries(executor, 'home-and-family');
    expect(entries.map((entry) => entry.entry.entryKey)).toEqual(['fixture:entry-003', 'fixture:entry-008']);
    expect(at(entries, 0)).toMatchObject({ chapterNumber: 2, variationKey: '*', activeVariation: 'default' });
  });

  it('uses one alternative for a * entry (the first in upstream order), never a concatenation', () => {
    loadAzkarDevFixtures(executor);
    database.exec(`
      INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count, text_en, transliteration, source_text_sha256, repeat_group, repeat_times, speaker, source_dua_id)
      VALUES (-1, 15, 1, 'fixture:item-015', 'other', 3, 'recitation', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
      INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
      VALUES (-1, 15, 1, 'text', 'نص تجريبي ٩ — ليس ذكرًا', NULL, NULL, NULL, 'نص تجريبي ٩ ليس ذكرا');
      INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period)
      VALUES (-1, 'variation-check', 'browse', 9, NULL, 'session');
      INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position)
      VALUES (-1, 'variation-check', 1, 'other', 1);
    `);

    const morning = listCategoryEntries(executor, 'morning');
    expect(at(morning, 0)).toMatchObject({
      activeVariation: 'default',
      variations: [
        { key: 'default', labelIndex: 1, labelEn: null },
        { key: 'other', labelIndex: 2, labelEn: null },
      ],
    });
    expect(at(morning, 0).items.map((item) => item.itemKey)).toEqual(['fixture:item-001', 'fixture:item-002']);

    const switched = listCategoryEntries(executor, 'morning', { 'fixture:entry-001': 'other' });
    expect(at(switched, 0).activeVariation).toBe('other');
    expect(at(switched, 0).items.map((item) => item.itemKey)).toEqual(['fixture:item-015']);
  });

  it('keeps a specific link on exactly its variation, with no alternatives and no override', () => {
    loadAzkarDevFixtures(executor);
    database.exec(`
      INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count, text_en, transliteration, source_text_sha256, repeat_group, repeat_times, speaker, source_dua_id)
      VALUES (-1, 15, 1, 'fixture:item-015', 'other', 3, 'recitation', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
      INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
      VALUES (-1, 15, 1, 'text', 'نص تجريبي ٩ — ليس ذكرًا', NULL, NULL, NULL, 'نص تجريبي ٩ ليس ذكرا');
      INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period)
      VALUES (-1, 'variation-check', 'browse', 9, NULL, 'session');
      INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position)
      VALUES (-1, 'variation-check', 1, 'other', 1);
    `);

    const fixed = listCategoryEntries(executor, 'variation-check', { 'fixture:entry-001': 'default' });
    expect(at(fixed, 0)).toMatchObject({ variationKey: 'other', variations: [], activeVariation: 'other' });
    expect(at(fixed, 0).items.map((item) => item.itemKey)).toEqual(['fixture:item-015']);
  });

  it('returns an entry with its chapter, notes grouped by kind, and no recordings', () => {
    loadAzkarDevFixtures(executor);

    const detail = getEntry(executor, 'fixture:entry-007');
    expect(detail?.chapter).toMatchObject({ number: 2, titleAr: '[عنوان تجريبي]' });
    expect(detail?.items).toHaveLength(1);
    expect(detail?.recordings).toEqual([]);
    expect(Object.fromEntries(Object.entries(detail?.notes ?? {}).map(([kind, notes]) => [kind, notes.length]))).toEqual({
      explanation: 1,
      context: 1,
      virtue: 1,
      reference: 1,
      grade: 1,
    });
  });

  it('offers the alternatives of a * entry, and switches its units with the override', () => {
    loadAzkarDevFixtures(executor);

    const units = listCategoryUnits(executor, 'home-and-family', 'ar');
    expect(units.map((unit) => [unit.unitKey, unit.requiredCount])).toEqual([
      ['fixture:entry-003:default:g1', 3],
      ['fixture:item-012', 3],
    ]);
    expect(at(units, 1)).toMatchObject({
      activeVariation: 'primary',
      variations: [
        { key: 'primary', labelIndex: 1, labelEn: null },
        { key: 'alternative', labelIndex: 2, labelEn: null },
      ],
    });

    const switched = listCategoryUnits(executor, 'home-and-family', 'ar', { 'fixture:entry-008': 'alternative' });
    expect(switched.map((unit) => unit.unitKey)).toEqual(['fixture:entry-003:default:g1', 'fixture:item-013']);
    expect(at(switched, 1).activeVariation).toBe('alternative');
    expect(switched.filter((unit) => unit.entryKey === 'fixture:entry-008')).toHaveLength(1);

    const unknown = listCategoryUnits(executor, 'home-and-family', 'ar', { 'fixture:entry-008': 'missing' });
    expect(unknown.map((unit) => unit.unitKey)).toEqual(['fixture:entry-003:default:g1', 'fixture:item-012']);
  });

  it('shows the active alternative in the entry detail, with every alternative listed', () => {
    loadAzkarDevFixtures(executor);

    const primary = getEntry(executor, 'fixture:entry-008');
    expect(primary).toMatchObject({ activeVariation: 'primary' });
    expect(primary?.items.map((item) => item.itemKey)).toEqual(['fixture:item-012']);
    expect(primary?.variations.map((variation) => variation.key)).toEqual(['primary', 'alternative']);

    const alternative = getEntry(executor, 'fixture:entry-008', { 'fixture:entry-008': 'alternative' });
    expect(alternative).toMatchObject({ activeVariation: 'alternative' });
    expect(alternative?.items.map((item) => item.itemKey)).toEqual(['fixture:item-013']);
  });

  it('returns undefined for an unknown entry', () => {
    loadAzkarDevFixtures(executor);
    expect(getEntry(executor, 'fixture:missing')).toBeUndefined();
  });

  it('resolves a quran segment through verses, and nothing else', () => {
    loadAzkarDevFixtures(executor);

    const detail = getEntry(executor, 'fixture:entry-002');
    const quran = at(detail?.items ?? [], 0).segments.find((segment) => segment.kind === 'quran');
    expect(quran).toBeDefined();
    expect(getQuranSegmentVerses(executor, quran!).map((verse) => verse.textUthmani)).toEqual(['FIXTURE VERSE 1:1']);

    const text = at(detail?.items ?? [], 0).segments.find((segment) => segment.kind === 'text');
    expect(getQuranSegmentVerses(executor, text!)).toEqual([]);
  });

  it('returns no verses for a quran reference that does not resolve', () => {
    expect(
      getQuranSegmentVerses(executor, { kind: 'quran', quranSurah: 114, quranVerseFrom: 6, quranVerseTo: null }),
    ).toEqual([]);
  });

  it('resolves a multi-verse quran segment in order', () => {
    expect(
      getQuranSegmentVerses(executor, { kind: 'quran', quranSurah: 1, quranVerseFrom: 1, quranVerseTo: 2 }).map(
        (verse) => verse.verseKey,
      ),
    ).toEqual(['1:1', '1:2']);
  });
});

/**
 * Installs one azkar resource with one category, one entry, one item and one text segment. The text is a placeholder;
 * `source` makes each resource's rows distinguishable. Both resources share the category id, as two upstream books do.
 */
function installAzkarSource(executor: SqlExecutor, resourceId: number, source: string): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'azkar', 1, 'hash', 0)`,
    [resourceId],
  );
  executor.run(
    `INSERT INTO azkar_chapters (resource_id, id, source_chapter_id, number, title_ar, title_en) VALUES (?, 1, ?, 1, ?, 'FIXTURE chapter')`,
    [resourceId, `${source}-chapter-1`, `[عنوان ${source}]`],
  );
  executor.run(
    `INSERT INTO azkar_entries (resource_id, id, entry_key, chapter_id, position, source_reference, entry_type, occasion,
       timing_type, timing_prayer, timing_policy_id, review_status, source_version, imported_at)
     VALUES (?, 1, ?, 1, 1, 'FIXTURE-1', 'invocation', 'morning', 'time_period', NULL, NULL, 'sourced', ?, 0)`,
    [resourceId, `${source}:entry-1`, source],
  );
  executor.run(
    `INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count,
       speaker, source_dua_id, text_en, transliteration, source_text_sha256, repeat_group, repeat_times)
     VALUES (?, 1, 1, ?, 'default', 1, 'recitation', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
    [resourceId, `${source}:item-1`],
  );
  executor.run(
    `INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
     VALUES (?, 1, 1, 'text', ?, NULL, NULL, NULL, ?)`,
    [resourceId, `FIXTURE shared text ${source}`, `fixture shared text ${source}`],
  );
  executor.run(
    `INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period)
     VALUES (?, 'morning', 'session', 1, 'morning', 'daily')`,
    [resourceId],
  );
  executor.run(
    `INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position)
     VALUES (?, 'morning', 1, '*', 1)`,
    [resourceId],
  );
}

describe('azkar active resource', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('falls back to the dev fixture id when no real azkar resource is installed', () => {
    expect(activeAzkarResourceId(executor)).toBe(-1);
  });

  it('picks the lowest installed azkar resource id, deterministically', () => {
    installAzkarSource(executor, 3, 'hisn');
    installAzkarSource(executor, 2, 'opendua');

    expect(activeAzkarResourceId(executor)).toBe(2);
  });

  it('lists each category once when two azkar resources are installed', () => {
    installAzkarSource(executor, 2, 'opendua');
    installAzkarSource(executor, 3, 'hisn');

    const categories = listCategories(executor, 'ar');
    expect(categories.map((category) => [category.id, category.unitCount])).toEqual([['morning', 1]]);
    expect(listCategoryIds(executor)).toEqual(['morning']);
    expect(getCategory(executor, 'morning')?.resourceId).toBe(2);
  });

  it('reads the entries, units and entry detail of the active resource only', () => {
    installAzkarSource(executor, 2, 'opendua');
    installAzkarSource(executor, 3, 'hisn');

    const entries = listCategoryEntries(executor, 'morning');
    expect(entries.map((entry) => entry.entry.entryKey)).toEqual(['opendua:entry-1']);
    expect(listCategoryUnits(executor, 'morning', 'ar').map((unit) => unit.entryKey)).toEqual(['opendua:entry-1']);
    expect(getEntry(executor, 'opendua:entry-1')?.items.map((item) => item.itemKey)).toEqual(['opendua:item-1']);
    expect(getEntry(executor, 'hisn:entry-1')).toBeUndefined();
  });

  it('searches the active resource only, so a match is never reported twice', () => {
    installAzkarSource(executor, 2, 'opendua');
    installAzkarSource(executor, 3, 'hisn');

    const hits = searchAzkarEntries(executor, 'shared');
    expect(hits.map((hit) => hit.entryKey)).toEqual(['opendua:entry-1']);
    expect(hasAzkarContent(executor)).toBe(true);
  });

  it('ignores dev fixtures once a real azkar resource is installed', () => {
    loadAzkarDevFixtures(executor);
    installAzkarSource(executor, 2, 'opendua');

    expect(listCategoryIds(executor)).toEqual(['morning']);
    expect(getCategory(executor, 'evening')).toBeUndefined();
    expect(getEntry(executor, 'fixture:entry-001')).toBeUndefined();
  });

  it('reads the fixtures when no real azkar resource is installed', () => {
    loadAzkarDevFixtures(executor);

    expect(listCategoryIds(executor)).toContain('evening');
    expect(hasAzkarContent(executor)).toBe(true);
  });

  it('reports no content when only a removed resource left no rows behind', () => {
    installAzkarSource(executor, 2, 'opendua');
    executor.run('DELETE FROM installed_resources WHERE resource_id = 2');

    expect(hasAzkarContent(executor)).toBe(false);
  });
});
