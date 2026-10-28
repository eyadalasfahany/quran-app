import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getTableColumns } from 'drizzle-orm';

import { chapters, meta, verses, words } from '@/core/db/content/schema';
import { importSeedIfNeeded, type SeedSource } from '@/core/db/content/seed';
import { CHAPTER_COLUMNS, META_COLUMNS, SEED_TABLES, VERSE_COLUMNS, WORD_COLUMNS } from '@/core/db/content/seed-schema';
import { getVerse, getVersesByPage } from '@/core/db/content/verses';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { applyContentMigrations } from '../jest/apply-content-migrations';
import { openNodeSqlite } from '../jest/node-sqlite-executor';

const repoRoot = join(process.cwd(), '../..');
const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const committedSeed = join(process.cwd(), 'assets/db/tanzil-seed.db');
const seedScript = join(process.cwd(), 'scripts/build-content-seed.mjs');

const AYAH_1_1 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

jest.setTimeout(30_000);

describe('Tanzil seed', () => {
  let directory: string;
  let seedPath: string;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'tanzil-seed-'));
    seedPath = join(directory, 'tanzil-seed.db');
    execFileSync(process.execPath, [seedScript, seedPath], { cwd: process.cwd() });
  });

  afterAll(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('loads 114 chapters and 6,236 verses with the Tanzil checksum', () => {
    const database = new DatabaseSync(seedPath, { readOnly: true });
    try {
      expect(count(database, 'chapters')).toBe(114);
      expect(count(database, 'verses')).toBe(6236);
      expect(checksum(seedPath, 'text_uthmani', 'bismillah_text', 'TANZIL_UTHMANI_CHECKSUM')).toBe(true);
      expect(checksum(seedPath, 'text_imlaei', 'bismillah_imlaei', 'TANZIL_SIMPLE_CHECKSUM')).toBe(true);
      expect(tableNames(database)).toEqual(['chapters', 'meta', 'verses', 'words']);
    } finally {
      database.close();
    }
  });

  it('places 2:255 and the fifteen sajdah verses', () => {
    const database = new DatabaseSync(seedPath, { readOnly: true });
    try {
      const verse = database.prepare('SELECT id, juz, hizb, rub_el_hizb, page, sajdah FROM verses WHERE verse_key = ?').get('2:255') as {
        id: number;
        juz: number;
        hizb: number;
        rub_el_hizb: number;
        page: number;
        sajdah: string;
      };
      expect(verse).toEqual({ id: 262, juz: 3, hizb: 5, rub_el_hizb: 17, page: 42, sajdah: 'none' });
      expect(countWhere(database, "sajdah != 'none'")).toBe(15);

      const opening = database
        .prepare('SELECT revelation_place, bismillah_pre, page_start, page_end FROM chapters WHERE id = ?')
        .get(1) as { revelation_place: string; bismillah_pre: number; page_start: number; page_end: number };
      const cow = database.prepare('SELECT revelation_place, bismillah_pre, page_start FROM chapters WHERE id = ?').get(2) as {
        revelation_place: string;
        bismillah_pre: number;
        page_start: number;
      };
      const repentance = database.prepare('SELECT bismillah_pre FROM chapters WHERE id = ?').get(9) as {
        bismillah_pre: number;
      };
      expect(opening).toEqual({ revelation_place: 'makkah', bismillah_pre: 0, page_start: 1, page_end: 1 });
      expect(cow).toEqual({ revelation_place: 'madinah', bismillah_pre: 1, page_start: 2 });
      expect(repentance.bismillah_pre).toBe(0);
    } finally {
      database.close();
    }
  });

  it('keeps 1:1 byte for byte and records the bundled Tanzil marker', () => {
    const database = new DatabaseSync(seedPath, { readOnly: true });
    try {
      const verse = database
        .prepare('SELECT text_uthmani, text_search, text_imlaei FROM verses WHERE verse_key = ?')
        .get('1:1') as { text_uthmani: string; text_search: string; text_imlaei: string | null };
      expect(verse.text_uthmani).toBe(AYAH_1_1);
      expect(verse.text_search).toBe('بسم الله الرحمن الرحيم');
      expect(verse.text_imlaei).toEqual(expect.any(String));
      const second = database.prepare('SELECT text_search FROM verses WHERE verse_key = ?').get('1:2') as {
        text_search: string;
      };
      expect(second.text_search).toBe('الحمد لله رب العالمين');

      const bundled = database.prepare('SELECT value FROM meta WHERE key = ?').get('bundled_text') as {
        value: string;
      };
      expect(bundled.value).toBe('tanzil-uthmani-1.1');
    } finally {
      database.close();
    }
  });

  it('uses the same columns as the Drizzle schema', () => {
    const database = new DatabaseSync(seedPath, { readOnly: true });
    try {
      expect(columnNames(database, 'meta')).toEqual([...META_COLUMNS]);
      expect(columnNames(database, 'chapters')).toEqual([...CHAPTER_COLUMNS]);
      expect(columnNames(database, 'verses')).toEqual([...VERSE_COLUMNS]);
      expect(columnNames(database, 'words')).toEqual([...WORD_COLUMNS]);
      expect(columnNames(database, 'meta')).toEqual(drizzleColumnNames(meta));
      expect(columnNames(database, 'chapters')).toEqual(drizzleColumnNames(chapters));
      expect(columnNames(database, 'verses')).toEqual(drizzleColumnNames(verses));
      expect(columnNames(database, 'words')).toEqual(drizzleColumnNames(words));
    } finally {
      database.close();
    }
  });

  it('matches the committed seed row for row', () => {
      expect(rowChecksum(seedPath)).toBe(rowChecksum(committedSeed));
    });

  it('stores the Basmala on 112 chapters and one end word per verse', () => {
    const database = new DatabaseSync(seedPath, { readOnly: true });
    try {
      const missing = database
        .prepare('SELECT id FROM chapters WHERE bismillah_text IS NULL OR bismillah_imlaei IS NULL ORDER BY id')
        .all() as { id: number }[];
      const present = database
        .prepare('SELECT count(*) AS count FROM chapters WHERE bismillah_text IS NOT NULL AND bismillah_imlaei IS NOT NULL')
        .get() as { count: number };
      expect(missing.map((chapter) => chapter.id)).toEqual([1, 9]);
      expect(present.count).toBe(112);

      const ends = database.prepare("SELECT count(*) AS count FROM words WHERE char_type = 'end'").get() as {
        count: number;
      };
      const versesWithOneEnd = database
        .prepare(
          "SELECT count(*) AS count FROM (SELECT verse_id FROM words WHERE char_type = 'end' GROUP BY verse_id HAVING count(*) = 1)",
        )
        .get() as { count: number };
      expect(ends.count).toBe(6236);
      expect(versesWithOneEnd.count).toBe(6236);

      const baqara = database.prepare('SELECT id FROM verses WHERE verse_key = ?').get('2:181') as { id: number };
      const baqaraWords = database
        .prepare('SELECT count(*) AS count FROM words WHERE verse_id = ? AND char_type = ?')
        .get(baqara.id, 'word') as { count: number };
      const baqaraEnd = database
        .prepare('SELECT count(*) AS count FROM words WHERE verse_id = ? AND char_type = ?')
        .get(baqara.id, 'end') as { count: number };
      expect(baqaraWords.count).toBe(14);
      expect(baqaraEnd.count).toBe(1);

      const verse = database.prepare('SELECT id, text_uthmani FROM verses WHERE verse_key = ?').get('2:255') as {
        id: number;
        text_uthmani: string;
      };
      const wordRows = database
        .prepare(
          "SELECT text_uthmani FROM words WHERE verse_id = ? AND char_type = 'word' ORDER BY position",
        )
        .all(verse.id) as { text_uthmani: string }[];
      expect(wordRows.map((word) => word.text_uthmani).join(' ')).toBe(verse.text_uthmani);

      const version = database.prepare('SELECT value FROM meta WHERE key = ?').get('word_map_version') as {
        value: string;
      };
      expect(version.value).toBe('1');
    } finally {
      database.close();
    }
  });
});

describe('content migrations', () => {
  it('apply to an empty database', () => {
    const { database, executor } = openNodeSqlite(':memory:');
    try {
      applyContentMigrations(executor, migrationsDir);
      const names = tableNames(database);
      expect(names).toEqual(expect.arrayContaining([...SEED_TABLES, 'search_quran']));
      expect(names).not.toContain('translation_entries');
      expect(count(database, 'verses')).toBe(0);
    } finally {
      database.close();
    }
  });
});

describe('importSeedIfNeeded', () => {
  let directory: string;
  let seedPath: string;
  let seed: SeedSource;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'tanzil-import-'));
    seedPath = join(directory, 'tanzil-seed.db');
    execFileSync(process.execPath, [seedScript, seedPath], { cwd: process.cwd() });
    seed = { path: () => seedPath };
  });

  afterAll(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('copies the seed into an empty migrated database and fills search', async () => {
    const { database, executor } = openNodeSqlite(':memory:');
    try {
      applyContentMigrations(executor, migrationsDir);
      await importSeedIfNeeded(executor, seed);

      expect(count(database, 'chapters')).toBe(114);
      expect(count(database, 'verses')).toBe(6236);
      expect(count(database, 'words')).toBeGreaterThan(6236);
      expect(getVerse(executor, '2:255')).toMatchObject({ id: 262, juz: 3, page: 42, verseKey: '2:255' });
      expect(getVersesByPage(executor, 1).map((verse) => verse.verseKey)).toEqual([
        '1:1',
        '1:2',
        '1:3',
        '1:4',
        '1:5',
        '1:6',
        '1:7',
      ]);

      const hits = executor.all<{ verseId: number }>(
        'SELECT verse_id AS verseId FROM search_quran WHERE search_quran MATCH ?',
        ['الحمد'],
      );
      expect(hits.map((hit) => hit.verseId)).toContain(2);
    } finally {
      database.close();
    }
  });

  it('does nothing on the second run', async () => {
    const { database, executor } = openNodeSqlite(':memory:');
    let calls = 0;
    const tracked: SeedSource = {
      path: () => {
        calls += 1;
        return seedPath;
      },
    };
    try {
      applyContentMigrations(executor, migrationsDir);
      await importSeedIfNeeded(executor, tracked);
      executor.run('UPDATE verses SET text_uthmani = ? WHERE verse_key = ?', ['changed', '1:1']);
      await importSeedIfNeeded(executor, tracked);

      expect(calls).toBe(1);
      expect(getVerse(executor, '1:1')?.textUthmani).toBe('changed');
      expect(count(database, 'verses')).toBe(6236);
    } finally {
      database.close();
    }
  });

  it('skips when verses already exist or the bundled marker is set', async () => {
    const marked = openNodeSqlite(':memory:');
    const occupied = openNodeSqlite(':memory:');
    let calls = 0;
    const tracked: SeedSource = {
      path: () => {
        calls += 1;
        return seedPath;
      },
    };
    try {
      applyContentMigrations(marked.executor, migrationsDir);
      applyContentMigrations(occupied.executor, migrationsDir);
      marked.executor.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['bundled_text', 'tanzil-uthmani-1.1']);
      occupied.executor.run(
        `INSERT INTO verses (
          id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, '1:1', 1, 1, 1, 1, 1, 1, 'none', 'ب', 'ب'],
      );

      await importSeedIfNeeded(marked.executor, tracked);
      await importSeedIfNeeded(occupied.executor, tracked);

      expect(calls).toBe(0);
      expect(count(marked.database, 'verses')).toBe(0);
      expect(count(occupied.database, 'verses')).toBe(1);
    } finally {
      marked.database.close();
      occupied.database.close();
    }
  });

  it('rolls back when the import fails in the middle', async () => {
    const { database, executor } = openNodeSqlite(':memory:');
    const failing = failingExecutor(executor);
    try {
      applyContentMigrations(executor, migrationsDir);
      await expect(importSeedIfNeeded(failing, seed)).rejects.toThrow('import failed');
      expect(count(database, 'chapters')).toBe(0);
      expect(count(database, 'verses')).toBe(0);
      expect(count(database, 'words')).toBe(0);
      expect(count(database, 'meta')).toBe(0);
      expect(count(database, 'search_quran')).toBe(0);
    } finally {
      database.close();
    }
  });
});

function checksum(databasePath: string, textColumn: string, bismillahColumn: string, expectedExport: string): boolean {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { DatabaseSync } from 'node:sqlite';
import { ayahChecksum, TANZIL_SIMPLE_CHECKSUM, TANZIL_UTHMANI_CHECKSUM } from './packages/quran-text-check/src/index.ts';
const expected = { TANZIL_UTHMANI_CHECKSUM, TANZIL_SIMPLE_CHECKSUM }[process.env.EXPECTED_EXPORT];
const database = new DatabaseSync(process.env.SEED_DB, { readOnly: true });
const texts = database.prepare(
  \`SELECT CASE
    WHEN verses.verse_number = 1 AND chapters.\${process.env.BISMILLAH_COLUMN} IS NOT NULL
    THEN chapters.\${process.env.BISMILLAH_COLUMN} || ' ' || verses.\${process.env.TEXT_COLUMN}
    ELSE verses.\${process.env.TEXT_COLUMN}
  END AS line
  FROM verses
  JOIN chapters ON chapters.id = verses.chapter_id
  ORDER BY verses.id\`,
).all().map((row) => row.line);
process.stdout.write(ayahChecksum(texts) === expected ? 'match' : 'mismatch');
database.close();`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        SEED_DB: databasePath,
        TEXT_COLUMN: textColumn,
        BISMILLAH_COLUMN: bismillahColumn,
        EXPECTED_EXPORT: expectedExport,
      },
    },
  );

  return output === 'match';
}

function rowChecksum(databasePath: string): string {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync(process.env.SEED_DB, { readOnly: true });
const chapters = database.prepare('SELECT * FROM chapters ORDER BY id').all();
const verses = database.prepare('SELECT * FROM verses ORDER BY id').all();
const words = database.prepare('SELECT * FROM words ORDER BY verse_id, position').all();
const meta = database.prepare('SELECT * FROM meta ORDER BY key').all();
process.stdout.write(createHash('sha256').update(JSON.stringify({ chapters, verses, words, meta })).digest('hex'));
database.close();`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, SEED_DB: databasePath },
    },
  );

  return output;
}

function failingExecutor(inner: SqlExecutor): SqlExecutor {
  return {
    all: (sql, params) => inner.all(sql, params),
    exec(sql) {
      if (sql.includes('search_quran')) {
        throw new Error('import failed');
      }
      inner.exec(sql);
    },
    get: (sql, params) => inner.get(sql, params),
    run: (sql, params) => {
      inner.run(sql, params);
    },
    transaction: (fn) => inner.transaction(fn),
  };
}

function count(database: DatabaseSync, table: string): number {
  const row = database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function countWhere(database: DatabaseSync, where: string): number {
  const row = database.prepare(`SELECT count(*) AS count FROM verses WHERE ${where}`).get() as { count: number };
  return row.count;
}

function tableNames(database: DatabaseSync): string[] {
  return database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => (row as { name: string }).name)
    .filter((name) => !name.startsWith('search_quran_'));
}

function columnNames(database: DatabaseSync, table: string): string[] {
  return database
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name);
}

function drizzleColumnNames(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.values(getTableColumns(table)).map((column) => column.name);
}
