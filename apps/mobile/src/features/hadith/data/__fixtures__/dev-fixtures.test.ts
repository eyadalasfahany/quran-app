import type { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeHadithForSearch } from '@/core/text/normalizeHadithForSearch';

import { openAzkarContentDb } from '../../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, FIXTURE_SOURCE_CODE, loadHadithDevFixtures } from './dev-fixtures';

function count(executor: SqlExecutor, table: string, resourceId: number): number {
  return executor.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE resource_id = ?`, [resourceId])?.count ?? 0;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === '__fixtures__' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe('hadith dev fixtures', () => {
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

  it('leaves content.db without hadith rows until loaded', () => {
    expect(count(executor, 'hadith_collections', FIXTURE_MULTI.resourceId)).toBe(0);
    expect(executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM hadith_entries')?.count).toBe(0);
  });

  it('loads twice without duplicates', () => {
    loadHadithDevFixtures(executor);
    loadHadithDevFixtures(executor);
    const expected: [string, number, number][] = [
      ['hadith_collections', 1, 1],
      ['hadith_books', 3, 2],
      ['hadith_chapters', 2, 0],
      ['hadith_entries', 7, 3],
      ['search_hadith', 7, 3],
      ['hadith_grades', 0, 0],
      ['hadith_ref_aliases', 0, 0],
    ];
    for (const [table, multi, single] of expected) {
      expect(count(executor, table, FIXTURE_MULTI.resourceId)).toBe(multi);
      expect(count(executor, table, FIXTURE_SINGLE.resourceId)).toBe(single);
    }
  });

  it('uses only placeholder text and the dev-fixture source', () => {
    loadHadithDevFixtures(executor);
    const rows = executor.all<{ textAr: string }>('SELECT text_ar AS textAr FROM hadith_entries');
    for (const row of rows) {
      expect(row.textAr.startsWith('FIXTURE text') || row.textAr === 'نص تجريبي ١ — ليس حديثًا' || row.textAr.startsWith('FIXTURE text')).toBe(true);
    }
    const codes = executor.all<{ sourceCode: string }>('SELECT source_code AS sourceCode FROM hadith_collections');
    expect(codes.map((row) => row.sourceCode)).toEqual([FIXTURE_SOURCE_CODE, FIXTURE_SOURCE_CODE]);
  });

  it('derives text_search with the hadith normaliser', () => {
    loadHadithDevFixtures(executor);
    const rows = executor.all<{ textAr: string; textSearch: string }>(
      'SELECT text_ar AS textAr, text_search AS textSearch FROM hadith_entries',
    );
    expect(rows.length).toBe(10);
    for (const row of rows) {
      expect(row.textSearch).toBe(normalizeHadithForSearch(row.textAr));
    }
  });

  it('is not imported by production code', () => {
    const roots = [join(process.cwd(), 'src/features/hadith'), join(process.cwd(), 'src/core')];
    const offenders = roots
      .flatMap((root) => sourceFiles(root))
      .filter((file) => readFileSync(file, 'utf8').includes('__fixtures__'));
    expect(offenders).toEqual([]);
  });
});
