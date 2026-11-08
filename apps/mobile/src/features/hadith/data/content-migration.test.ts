import { getTableColumns } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SqlExecutor } from '@/core/db/sql-executor';
import * as schema from '@/core/db/content/schema';
import { contentGroup } from '@/core/sync/content-tables';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';

const MIGRATIONS = join(process.cwd(), 'src/core/db/content/migrations');

type Journal = { entries: { idx: number; tag: string; when: number }[] };

function readJournal(): Journal {
  return JSON.parse(readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as Journal;
}

const HADITH_TABLES = [
  'hadith_collections',
  'hadith_books',
  'hadith_chapters',
  'hadith_entries',
  'hadith_grades',
  'hadith_ref_aliases',
] as const;

const DRIZZLE_TABLES = {
  hadith_collections: schema.hadithCollections,
  hadith_books: schema.hadithBooks,
  hadith_chapters: schema.hadithChapters,
  hadith_entries: schema.hadithEntries,
  hadith_grades: schema.hadithGrades,
  hadith_ref_aliases: schema.hadithRefAliases,
} as const;

const HADITH_INDEXES = [
  'hadith_collections_slug_unique',
  'hadith_books_position_idx',
  'hadith_chapters_book_position_idx',
  'hadith_entries_number_idx',
  'hadith_entries_book_position_idx',
  'hadith_grades_entry_idx',
] as const;

function names(executor: SqlExecutor, sql: string): string[] {
  return executor.all<{ name: string }>(sql).map((row) => row.name);
}

function columnsOf(executor: SqlExecutor, table: string): { name: string; notnullFlag: number }[] {
  return executor.all<{ name: string; notnullFlag: number }>(
    `SELECT name, "notnull" AS notnullFlag FROM pragma_table_info('${table}') ORDER BY cid`,
  );
}

describe('content.db hadith migration', () => {
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

  it('creates the six hadith tables and search_hadith', () => {
    const tables = names(executor, `SELECT name FROM sqlite_master WHERE type = 'table'`);
    for (const table of HADITH_TABLES) {
      expect(tables).toContain(table);
    }
    expect(tables).toContain('search_hadith');
  });

  it('matches the pack columns of content-tables in order', () => {
    const group = contentGroup('hadith_collections');
    expect(group).toBeDefined();
    for (const table of group?.tables ?? []) {
      const actual = columnsOf(executor, table.name).map((column) => column.name);
      expect(actual).toEqual(table.columns.map((column) => column.name));
    }
  });

  it('matches the Drizzle schema columns', () => {
    for (const table of HADITH_TABLES) {
      const drizzleColumns = Object.values(getTableColumns(DRIZZLE_TABLES[table])).map((column) => column.name);
      expect(columnsOf(executor, table).map((column) => column.name)).toEqual(drizzleColumns);
    }
  });

  it('declares nullability as the pack contract does', () => {
    const group = contentGroup('hadith_collections');
    for (const table of group?.tables ?? []) {
      const sqlite = columnsOf(executor, table.name);
      for (const column of table.columns) {
        const found = sqlite.find((item) => item.name === column.name);
        expect(found?.notnullFlag).toBe(column.nullable ? 0 : 1);
      }
    }
  });

  it('adds the nullable number range and source code to hadith_entries (migration 0014)', () => {
    const added = columnsOf(executor, 'hadith_entries').filter((column) =>
      ['number_first', 'number_last', 'source_code'].includes(column.name),
    );
    expect(added.map((column) => column.name)).toEqual(['number_first', 'number_last', 'source_code']);
    expect(added.every((column) => column.notnullFlag === 0)).toBe(true);
  });

  it('keeps hadith_number text and not unique', () => {
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url)
       VALUES (-9, 1, 1, NULL, '2787.2', NULL, 1, 'FIXTURE text', NULL, NULL, 'fixture text', NULL)`,
    );
    executor.run(
      `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url)
       VALUES (-9, 2, 1, NULL, '2787.2', NULL, 2, 'FIXTURE text', NULL, NULL, 'fixture text', NULL)`,
    );
    const type = executor.get<{ type: string }>(`SELECT typeof(hadith_number) AS type FROM hadith_entries WHERE id = 1`);
    expect(type?.type).toBe('text');
  });

  it('creates the documented indexes', () => {
    const byName = new Map<string, number>();
    for (const table of HADITH_TABLES) {
      for (const row of executor.all<{ name: string; isUnique: number }>(
        `SELECT name, "unique" AS isUnique FROM pragma_index_list('${table}')`,
      )) {
        byName.set(row.name, row.isUnique);
      }
    }
    for (const index of HADITH_INDEXES) {
      expect(byName.has(index)).toBe(true);
    }
    expect(byName.get('hadith_entries_number_idx')).toBe(0);
    expect(byName.get('hadith_books_position_idx')).toBe(0);
    expect(byName.get('hadith_collections_slug_unique')).toBe(1);
  });

  it('creates search_hadith as FTS5 with unindexed ids', () => {
    const row = executor.get<{ sql: string }>(`SELECT sql FROM sqlite_master WHERE name = 'search_hadith'`);
    const sql = row?.sql ?? '';
    expect(sql).toContain('fts5');
    expect(sql).toContain("unicode61 remove_diacritics 2");
    expect(sql).toContain('entry_id UNINDEXED');
    expect(sql).toContain('resource_id UNINDEXED');
  });

  it('holds no personal data: every hadith table is a pack table', () => {
    const tables = names(executor, `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'hadith%' ORDER BY name`);
    expect(tables).toEqual([...HADITH_TABLES, 'hadith_explanation_links', 'hadith_explanations'].sort());
    for (const personal of ['hadith_bookmarks', 'hadith_reading_position', 'hadith_search_history']) {
      expect(tables).not.toContain(personal);
    }
  });

  it('lists the new migrations in the journal in order', () => {
    const entries = readJournal().entries;
    const tags = entries.map((entry) => entry.tag);
    const start = tags.indexOf('0011_duas_tables');
    expect(tags.slice(start, start + 3)).toEqual(['0011_duas_tables', '0012_hadith_tables', '0013_search_hadith']);
    const tail = entries.slice(start);
    for (let index = 1; index < tail.length; index += 1) {
      expect(at(tail, index).idx).toBeGreaterThan(at(tail, index - 1).idx);
      expect(at(tail, index).when).toBeGreaterThan(at(tail, index - 1).when);
    }
  });

  it('adds a nullable source_key to catalog_resources', () => {
    const column = columnsOf(executor, 'catalog_resources').find((item) => item.name === 'source_key');
    expect(column).toBeDefined();
    expect(column?.notnullFlag).toBe(0);
  });

  it('applies on top of a database migrated up to 0011', () => {
    const opened = openNodeSqlite(':memory:');
    const entries = readJournal().entries;
    for (const entry of entries.slice(0, 12)) {
      opened.executor.exec(readFileSync(join(MIGRATIONS, `${entry.tag}.sql`), 'utf8'));
    }
    opened.executor.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (5, 'duas', 1, 'x', 0)`,
    );
    for (const entry of entries.slice(12)) {
      opened.executor.exec(readFileSync(join(MIGRATIONS, `${entry.tag}.sql`), 'utf8'));
    }
    expect(opened.executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM installed_resources')?.count).toBe(1);
    opened.database.close();
  });


  it('creates the explanation tables with the pack columns and nullability (migration 0016)', () => {
    const group = contentGroup('hadith_explanations');
    expect(group).toBeDefined();
    for (const table of group?.tables ?? []) {
      const sqlite = columnsOf(executor, table.name);
      expect(sqlite.map((column) => column.name)).toEqual(table.columns.map((column) => column.name));
      for (const column of table.columns) {
        expect(sqlite.find((item) => item.name === column.name)?.notnullFlag).toBe(column.nullable ? 0 : 1);
      }
    }
  });

  it('matches the Drizzle explanation schema columns', () => {
    const pairs = [
      ['hadith_explanations', schema.hadithExplanations],
      ['hadith_explanation_links', schema.hadithExplanationLinks],
    ] as const;
    for (const [table, drizzleTable] of pairs) {
      const drizzleColumns = Object.values(getTableColumns(drizzleTable)).map((column) => column.name);
      expect(columnsOf(executor, table).map((column) => column.name)).toEqual(drizzleColumns);
    }
  });

  it('indexes the explanation links by collection and hadith number', () => {
    const indexes = names(executor, `SELECT name FROM pragma_index_list('hadith_explanation_links')`);
    expect(indexes).toContain('hadith_explanation_links_number_idx');
  });

  it('migration 0016 only adds the two explanation tables and their index', () => {
    const sql = readFileSync(join(MIGRATIONS, '0016_hadith_explanations.sql'), 'utf8');
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(2);
    expect(sql.match(/CREATE INDEX/g)).toHaveLength(1);
    expect(sql).not.toMatch(/ALTER TABLE|DROP /);
  });
});
