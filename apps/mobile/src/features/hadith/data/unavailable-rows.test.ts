import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, loadHadithDevFixtures } from './__fixtures__/dev-fixtures';
import { getHadith, listBookHadith } from './content-repository';
import { searchHadith } from './search';

/** Placeholder rows (ADR 0076): `source_code` 'unavailable', empty `text_ar` and empty `text_search`. Placeholder text only. */
function insertPlaceholder(executor: SqlExecutor, bookId: number): void {
  executor.run(
    `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url, number_first, number_last, source_code)
     VALUES (?, 91, ?, NULL, '5730', NULL, 91, '', NULL, NULL, '', NULL, NULL, NULL, 'unavailable')`,
    [FIXTURE_MULTI.resourceId, bookId],
  );
  // The pack's after-import step copies every row's text_search, empty ones included.
  executor.run(`INSERT INTO search_hadith (entry_id, resource_id, text_search) VALUES (91, ?, '')`, [FIXTURE_MULTI.resourceId]);
}

describe('placeholder rows', () => {
  let database: ReturnType<typeof openAzkarContentDb>['database'];
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('never appears in search, whatever the query', () => {
    loadHadithDevFixtures(executor);
    const bookId = getHadith(executor, FIXTURE_MULTI.slug, '1')?.book.id ?? 0;
    const before = searchHadith(executor, 'FIXTURE', { slugs: [FIXTURE_MULTI.slug] });
    expect(before.hits.length).toBeGreaterThan(0);

    insertPlaceholder(executor, bookId);
    const after = searchHadith(executor, 'FIXTURE', { slugs: [FIXTURE_MULTI.slug] });

    expect(after.hits.map((hit) => hit.item.id)).not.toContain(91);
    expect(after.hits.length).toBe(before.hits.length);
    expect(searchHadith(executor, '٥٧٣٠', { slugs: [FIXTURE_MULTI.slug] }).hits).toHaveLength(0);
  });

  it('still lists and opens by number, with the source code and an empty text', () => {
    loadHadithDevFixtures(executor);
    const bookId = getHadith(executor, FIXTURE_MULTI.slug, '1')?.book.id ?? 0;
    insertPlaceholder(executor, bookId);

    const row = at(
      listBookHadith(executor, FIXTURE_MULTI.slug, bookId).filter((item) => item.id === 91),
      0,
    );
    expect(row.sourceCode).toBe('unavailable');
    expect(row.textAr).toBe('');
    expect(getHadith(executor, FIXTURE_MULTI.slug, '5730')?.sourceCode).toBe('unavailable');
  });
});
