import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from './__fixtures__/dev-fixtures';
import { HADITH_SEARCH_PAGE_SIZE, searchHadith } from './search';

describe('searchHadith', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    loadHadithDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('finds a hadith by a normalised query', () => {
    const page = searchHadith(executor, 'تجريبي');
    expect(page.hits.map((hit) => hit.item.id)).toEqual([5]);
    expect(page.hits[0]?.collection.slug).toBe(FIXTURE_MULTI.slug);
  });

  it('matches diacritic and alef variants', () => {
    const withDiacritic = searchHadith(executor, 'حديثًا');
    const plain = searchHadith(executor, 'حديثا');
    expect(withDiacritic.hits.map((hit) => hit.item.id)).toEqual([5]);
    expect(plain.hits.map((hit) => hit.item.id)).toEqual([5]);

    // A test-local placeholder row with an alef-hamza word: the index folds it to the plain alef.
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url)
       VALUES (-1, 50, 2, NULL, '50', NULL, 50, 'FIXTURE أمثلة', NULL, NULL, ?, NULL)`,
      [normalizeHadithForSearch('FIXTURE أمثلة')],
    );
    const textSearch = normalizeHadithForSearch('FIXTURE أمثلة');
    executor.run('INSERT INTO search_hadith (entry_id, resource_id, text_search) VALUES (50, -1, ?)', [textSearch]);
    expect(searchHadith(executor, 'أمثلة').hits.map((hit) => hit.item.id)).toEqual([50]);
    expect(searchHadith(executor, 'امثلة').hits.map((hit) => hit.item.id)).toEqual([50]);
  });

  it('matches Latin placeholder words case-insensitively', () => {
    const page = searchHadith(executor, 'FIXTURE', { limit: 50 });
    const ids = page.hits.map((hit) => `${hit.collection.slug}:${hit.item.id}`).sort();
    expect(ids).toEqual(
      [
        'fixture-multi:1',
        'fixture-multi:2',
        'fixture-multi:3',
        'fixture-multi:4',
        'fixture-multi:6',
        'fixture-multi:7',
        'fixture-single:1',
        'fixture-single:2',
        'fixture-single:3',
      ].sort(),
    );
  });

  it('scopes by slug', () => {
    const single = searchHadith(executor, 'FIXTURE', { slugs: [FIXTURE_SINGLE.slug] });
    expect(single.hits.map((hit) => hit.item.id).sort()).toEqual([1, 2, 3]);
    expect(single.hits.every((hit) => hit.collection.slug === FIXTURE_SINGLE.slug)).toBe(true);
    expect(searchHadith(executor, 'FIXTURE', { slugs: ['unknown-slug'] })).toEqual({ hits: [], hasMore: false });
  });

  it('returns highlight ranges on the original text', () => {
    const [hit] = searchHadith(executor, 'تجريبي').hits;
    expect(hit).toBeDefined();
    const [range] = hit?.ranges ?? [];
    expect(range).toBeDefined();
    expect(hit?.item.textAr.slice(range?.start, range?.end)).toBe('تجريبي');
  });

  it('returns the original text, not text_search', () => {
    const page = searchHadith(executor, 'FIXTURE', { slugs: [FIXTURE_MULTI.slug] });
    const hit = page.hits.find((item) => item.item.id === 6);
    expect(hit?.item.textAr).toContain('‏');
    expect(hit?.item.textAr).toBe(`FIXTURE text 6 — not a hadith‏`);
  });

  it('returns an empty page for an empty or punctuation-only query', () => {
    expect(searchHadith(executor, '')).toEqual({ hits: [], hasMore: false });
    expect(searchHadith(executor, ' ، ؟ ')).toEqual({ hits: [], hasMore: false });
  });

  it('pages with limit, offset and hasMore', () => {
    const first = searchHadith(executor, 'FIXTURE', { limit: 4, offset: 0 });
    expect(first.hits).toHaveLength(4);
    expect(first.hasMore).toBe(true);

    const second = searchHadith(executor, 'FIXTURE', { limit: 4, offset: 4 });
    expect(second.hits).toHaveLength(4);
    expect(second.hasMore).toBe(true);

    const last = searchHadith(executor, 'FIXTURE', { limit: 4, offset: 8 });
    expect(last.hits).toHaveLength(1);
    expect(last.hasMore).toBe(false);
    expect(HADITH_SEARCH_PAGE_SIZE).toBe(50);
  });

  it('does not search a removed collection', () => {
    executor.run('DELETE FROM search_hadith WHERE resource_id = ?', [FIXTURE_MULTI.resourceId]);
    const page = searchHadith(executor, 'FIXTURE');
    expect(page.hits.every((hit) => hit.collection.slug === FIXTURE_SINGLE.slug)).toBe(true);
    expect(page.hits).toHaveLength(3);
  });

  it('does not use the Quran index', () => {
    const before = executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM search_quran')?.count ?? 0;
    loadHadithDevFixtures(executor);
    const after = executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM search_quran')?.count ?? 0;
    expect(after).toBe(before);
  });
});
