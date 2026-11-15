import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { AZKAR_SEARCH_LIMIT, mapMatchToOriginal, matchesCategoryLabel, searchAzkarEntries } from './search';

/** Adds an entry with one item that holds only a Quran segment, in chapter 1 (test-only placeholder rows). */
function addQuranOnlyEntry(db: SqlExecutor): void {
  db.run(
    `INSERT INTO azkar_entries (resource_id, id, entry_key, chapter_id, position, source_reference, entry_type, occasion,
       timing_type, timing_prayer, timing_policy_id, review_status, source_version, imported_at)
     VALUES (-1, 99, 'fixture:entry-quran-only', 1, 9, 'FIXTURE-99', 'invocation', 'morning', 'anytime', NULL, NULL, 'sourced', 'taybah-dev-fixture', 0)`,
  );
  db.run(
    `INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count,
       speaker, source_dua_id, text_en, transliteration, source_text_sha256, repeat_group, repeat_times)
     VALUES (-1, 99, 99, 'fixture:item-quran-only', 'default', 1, 'recitation', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
  );
  db.run(
    `INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
     VALUES (-1, 99, 1, 'quran', NULL, 1, 1, 1, NULL)`,
  );
}

describe('azkar search', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    loadAzkarDevFixtures(executor);
    // Distinct chapter titles, so a title never matches the text queries below by accident.
    executor.run(`UPDATE azkar_chapters SET title_ar = ? WHERE resource_id = -1 AND id = 1`, ['عنوان مرجعي أول']);
    executor.run(`UPDATE azkar_chapters SET title_ar = ? WHERE resource_id = -1 AND id = 2`, ['عنوان مرجعي ثان']);
  });

  afterEach(() => {
    database.close();
  });

  it('returns nothing for an empty or whitespace query', () => {
    expect(searchAzkarEntries(executor, '')).toEqual([]);
    expect(searchAzkarEntries(executor, '   ')).toEqual([]);
  });

  it('finds entries by normalised text and returns the original Arabic as the preview', () => {
    const hits = searchAzkarEntries(executor, 'تجريبي');

    expect(at(hits, 0)).toEqual({
      entryKey: 'fixture:entry-001',
      preview: 'نص تجريبي ١ — ليس ذكرًا',
      highlight: { start: 3, end: 3 + 'تجريبي'.length },
    });
    expect(hits.map((hit) => hit.entryKey)).toContain('fixture:entry-007');
    expect(new Set(hits.map((hit) => hit.entryKey)).size).toBe(hits.length);
  });

  it('matches a query with diacritics against the normalised text, and keeps the preview original', () => {
    const hits = searchAzkarEntries(executor, 'نَصّ تَجْرِيبِيّ');

    expect(at(hits, 0)).toMatchObject({ entryKey: 'fixture:entry-001', preview: 'نص تجريبي ١ — ليس ذكرًا' });
  });

  it('finds a single entry by its own placeholder text', () => {
    const hits = searchAzkarEntries(executor, 'نص تجريبي ٨');
    expect(hits.map((hit) => hit.entryKey)).toEqual(['fixture:entry-007']);
    expect(at(hits, 0).preview).toBe('نص تجريبي ٨ — ليس ذكرًا');
  });

  it('puts an entry whose chapter title matches first, with its first text as the preview and no highlight', () => {
    const hits = searchAzkarEntries(executor, 'مرجعي أول');

    expect(hits).toEqual([
      { entryKey: 'fixture:entry-001', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: null },
      { entryKey: 'fixture:entry-002', preview: 'نص تجريبي ٣ — ليس ذكرًا', highlight: null },
    ]);
  });

  it('matches a chapter title with the same normalisation as text (diacritics and alef forms)', () => {
    expect(searchAzkarEntries(executor, 'عُنْوَانٌ مَرْجِعِيٌّ أَوَّلُ').map((hit) => hit.entryKey)).toEqual([
      'fixture:entry-001',
      'fixture:entry-002',
    ]);
  });

  it('lists a chapter-title hit once, even when its text also matches, and keeps the text hits after it', () => {
    executor.run(`UPDATE azkar_chapters SET title_ar = ? WHERE resource_id = -1 AND id = 1`, ['عنوان تجريبي أول']);

    const hits = searchAzkarEntries(executor, 'تجريبي');
    const keys = hits.map((hit) => hit.entryKey);

    expect(new Set(keys).size).toBe(keys.length);
    expect(hits.slice(0, 2)).toEqual([
      { entryKey: 'fixture:entry-001', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: null },
      { entryKey: 'fixture:entry-002', preview: 'نص تجريبي ٣ — ليس ذكرًا', highlight: null },
    ]);
    expect(keys).toContain('fixture:entry-007');
    expect(keys.indexOf('fixture:entry-007')).toBeGreaterThan(1);
  });

  it('never returns a Quran-only entry for a chapter-title match, and never searches Quran segments', () => {
    addQuranOnlyEntry(executor);

    expect(searchAzkarEntries(executor, 'مرجعي أول').map((hit) => hit.entryKey)).not.toContain('fixture:entry-quran-only');
    expect(searchAzkarEntries(executor, 'FIXTURE VERSE')).toEqual([]);
  });

  it('never searches Quran segments', () => {
    // Entry 2 has a quran segment (1:1) whose text lives in verses, not in the azkar tables.
    expect(searchAzkarEntries(executor, 'FIXTURE VERSE')).toEqual([]);
  });

  it('caps the results', () => {
    expect(searchAzkarEntries(executor, 'تجريبي', 1)).toHaveLength(1);
    expect(AZKAR_SEARCH_LIMIT).toBe(50);
    expect(searchAzkarEntries(executor, 'تجريبي').length).toBeLessThanOrEqual(AZKAR_SEARCH_LIMIT);
  });

  it('caps chapter-title hits too', () => {
    expect(searchAzkarEntries(executor, 'مرجعي أول', 1).map((hit) => hit.entryKey)).toEqual(['fixture:entry-001']);
  });

  it('treats LIKE wildcards in the query as plain text', () => {
    expect(searchAzkarEntries(executor, '%')).toEqual([]);
    expect(searchAzkarEntries(executor, '_')).toEqual([]);
  });
});

describe('mapMatchToOriginal', () => {
  it('maps a normalised match back to the original span, harakat included', () => {
    const original = 'إِنَّ اللَّهَ';
    const normalized = normalizeForSearch(original);
    const range = mapMatchToOriginal(original, normalized, 'الله');

    expect(range).not.toBeNull();
    const span = original.slice(range!.start, range!.end);
    expect(normalizeForSearch(span)).toBe('الله');
    expect(span.startsWith('ا')).toBe(true);
  });

  it('returns null when the query is not in the text', () => {
    expect(mapMatchToOriginal('نص تجريبي', normalizeForSearch('نص تجريبي'), 'غير موجود')).toBeNull();
  });
});

describe('matchesCategoryLabel', () => {
  it('matches a localised label with the same normalisation', () => {
    expect(matchesCategoryLabel('الصباح', 'أذكار الصباح')).toBe(true);
    expect(matchesCategoryLabel('أذكار', 'أذكار الصباح')).toBe(true);
    expect(matchesCategoryLabel('السفر', 'أذكار الصباح')).toBe(false);
    expect(matchesCategoryLabel('   ', 'أذكار الصباح')).toBe(false);
  });
});
