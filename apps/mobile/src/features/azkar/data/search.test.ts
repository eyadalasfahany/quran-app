import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { loadAzkarDevFixtures } from './dev-fixtures';
import { AZKAR_SEARCH_LIMIT, mapMatchToOriginal, matchesCategoryLabel, searchAzkarEntries } from './search';

describe('azkar search', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    loadAzkarDevFixtures(executor);
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

  it('never searches Quran segments', () => {
    // Entry 2 has a quran segment (1:1) whose text lives in verses, not in the azkar tables.
    expect(searchAzkarEntries(executor, 'FIXTURE VERSE')).toEqual([]);
  });

  it('caps the results', () => {
    expect(searchAzkarEntries(executor, 'تجريبي', 1)).toHaveLength(1);
    expect(AZKAR_SEARCH_LIMIT).toBe(50);
    expect(searchAzkarEntries(executor, 'تجريبي').length).toBeLessThanOrEqual(AZKAR_SEARCH_LIMIT);
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
