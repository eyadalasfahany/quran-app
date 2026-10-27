import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';
import { importSeedIfNeeded } from '@/core/db/content/seed';
import { columnList, contentGroup, type PackGroup } from '@/core/sync/content-tables';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { getChapter, listChapters } from './chapters';
import { getMushafPage, isPageInstalled } from './mushaf';
import { getTafsirForVerse, listInstalledTafsirs } from './tafsir';
import { getTranslations, listInstalledTranslations } from './translations';
import { getVerseByKey, getVerseRange, getVersesByPage, getVersesBySurah, idToVerseKey, verseKeyToId } from './verses';
import { getWords } from './words';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const seedPath = join(process.cwd(), 'assets/db/tanzil-seed.db');

const TRANSLATION_A = 131;
const TRANSLATION_B = 132;
const TAFSIR_ID = 169;
const MUSHAF_RESOURCE = 19;
const MUSHAF_ID = 1;
const CHECKED_AT = 1_700_000_000_000;
const SHA_A = 'sha-translation-a';
const SHA_B = 'sha-translation-b';
const SHA_TAFSIR = 'sha-tafsir';
const SHA_MUSHAF = 'sha-mushaf';
const PADDED_OPENING = ' \u200FMost Merciful ';
const PADDED_KURSIY = ' \u200FAyat al-Kursi ';
const FOOTNOTES = '[{"text":" note "}]';
const TAFSIR_HTML = '<p>تفسير </p>\u200F';
const NARROW_HTML = '<p>narrow </p>\u200F';
const AFTER_HTML = '<p>after</p>';
const CURSOR = 'cur\u200F ';
const GLYPH_LEADING = ' \u0640\u200F';
const GLYPH_MIDDLE = 'glyph';
const GLYPH_END = '\u06DD ';
const VERSE_MAPPING = '{"boundary":true}\u200F ';
const MUSHAF_NAME = 'Hafs ';

const PRIMARY_KEYS: Record<string, string> = {
  translation_entries: 'resource_id, verse_id',
  tafsir_entries: 'resource_id, group_tafsir_id',
  mushafs: 'id',
  mushaf_pages: 'mushaf_id, page_number',
  word_layouts: 'mushaf_id, word_id',
};

type Fixture = {
  boundaryPage: number;
  firstVerseId: number;
  lastVerseId: number;
  kursiyId: number;
  afterKursiyId: number;
  narrowStartId: number;
  baqarahStartId: number;
  fatihaEndId: number;
};

type Query = {
  sql: string;
  params: SqlValue[];
};

jest.setTimeout(30_000);

let database: DatabaseSync | undefined;
let executor: SqlExecutor;
let seed: DatabaseSync | undefined;
let fixture: Fixture;

beforeAll(async () => {
  const opened = openNodeSqlite(':memory:');
  database = opened.database;
  executor = opened.executor;
  seed = new DatabaseSync(seedPath, { readOnly: true });
  applyContentMigrations(executor, migrationsDir);
  await importSeedIfNeeded(executor, { path: () => seedPath });

  const boundaryPage = boundaryPageOf(executor);
  const onPage = getVersesByPage(executor, boundaryPage);
  const first = onPage[0];
  const last = onPage[onPage.length - 1];
  if (first === undefined || last === undefined || first.chapterId === last.chapterId) {
    throw new Error('Seed has no page that crosses a surah boundary.');
  }

  fixture = {
    boundaryPage,
    firstVerseId: first.id,
    lastVerseId: last.id,
    kursiyId: requiredVerse('2:255').id,
    afterKursiyId: requiredVerse('2:256').id,
    narrowStartId: requiredVerse('2:200').id,
    baqarahStartId: requiredVerse('2:1').id,
    fatihaEndId: requiredVerse('1:7').id,
  };
  installPacks(executor, fixture);
});

afterAll(() => {
  seed?.close();
  database?.close();
});

describe('chapters', () => {
  it('lists 114 chapters in order and returns stored names', () => {
    const chapters = listChapters(executor);
    const stored = seedRow<{ name_arabic: string; name_simple: string; name_en: string }>(
      'SELECT name_arabic, name_simple, name_en FROM chapters WHERE id = ?',
      1,
    );

    expect(chapters).toHaveLength(114);
    expect(chapters[0]?.id).toBe(1);
    expect(chapters[113]?.id).toBe(114);
    expect(chapters.map((chapter) => chapter.id)).toEqual(chapters.map((chapter) => chapter.id).sort((left, right) => left - right));
    expectSameText(chapters[0]?.nameArabic, stored.name_arabic);
    expectSameText(chapters[0]?.nameSimple, stored.name_simple);
    expectSameText(chapters[0]?.nameEn, stored.name_en);
    expect(getChapter(executor, 0)).toBeUndefined();
  });

  it('returns no Basmala for surah 1 and surah 9, and the stored Basmala for surah 2', () => {
    const opening = getChapter(executor, 1);
    const tawbah = getChapter(executor, 9);
    const cow = getChapter(executor, 2);
    const stored = seedRow<{ bismillah_text: string; bismillah_imlaei: string }>(
      'SELECT bismillah_text, bismillah_imlaei FROM chapters WHERE id = ?',
      2,
    );

    expect(opening?.bismillahPre).toBe(0);
    expect(opening?.bismillahText).toBeNull();
    expect(opening?.bismillahImlaei).toBeNull();
    expect(tawbah?.bismillahPre).toBe(0);
    expect(tawbah?.bismillahText).toBeNull();
    expect(tawbah?.bismillahImlaei).toBeNull();
    expect(cow?.bismillahPre).toBe(1);
    expectSameText(cow?.bismillahText ?? null, stored.bismillah_text);
    expectSameText(cow?.bismillahImlaei ?? null, stored.bismillah_imlaei);

    const fatiha = getVersesBySurah(executor, 1);
    const repentance = getVersesBySurah(executor, 9);
    if (tawbah === undefined) {
      throw new Error('Missing surah 9.');
    }
    expect(fatiha.map((verse) => verse.verseKey)).toEqual(['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7']);
    expect(repentance).toHaveLength(tawbah.versesCount);
    expect(repentance[0]?.verseKey).toBe('9:1');
    expect(repentance[0]?.verseNumber).toBe(1);
  });
});

describe('verses', () => {
  it('keeps 2:255 byte for byte with the seed', () => {
    const verse = getVerseByKey(executor, '2:255');
    const stored = seedRow<{
      id: number;
      text_uthmani: string;
      text_uthmani_tajweed: string | null;
      text_indopak: string | null;
      text_imlaei: string | null;
      text_search: string;
      verse_key: string;
    }>('SELECT id, verse_key, text_uthmani, text_uthmani_tajweed, text_indopak, text_imlaei, text_search FROM verses WHERE verse_key = ?', '2:255');

    expect(verse?.id).toBe(stored.id);
    expectSameText(verse?.verseKey, stored.verse_key);
    expectSameText(verse?.textUthmani, stored.text_uthmani);
    expectSameText(verse?.textUthmaniTajweed, stored.text_uthmani_tajweed);
    expectSameText(verse?.textIndopak, stored.text_indopak);
    expectSameText(verse?.textImlaei, stored.text_imlaei);
    expectSameText(verse?.textSearch, stored.text_search);
    expect(verse?.textUthmani.length).toBeGreaterThan(20);
  });

  it('reads a page, a surah, a range, and verse-key ids', () => {
    const page = getVersesByPage(executor, fixture.boundaryPage);
    const storedKeys = requireSeed()
      .prepare('SELECT verse_key AS verseKey FROM verses WHERE page = ? ORDER BY id')
      .all(fixture.boundaryPage) as { verseKey: string }[];
    expect(page.map((verse) => verse.verseKey)).toEqual(storedKeys.map((row) => row.verseKey));
    expect(new Set(page.map((verse) => verse.chapterId)).size).toBeGreaterThan(1);

    const opening = getVersesByPage(executor, 1);
    expect(opening.map((verse) => verse.chapterId)).toEqual(opening.map(() => 1));
    expect(getVerseRange(executor, opening[0]?.id ?? 0, opening[opening.length - 1]?.id ?? 0).map((verse) => verse.verseKey)).toEqual(
      opening.map((verse) => verse.verseKey),
    );
    expect(getVerseRange(executor, fixture.lastVerseId, fixture.firstVerseId)).toEqual([]);

    const kursiy = requiredVerse('2:255');
    expect(verseKeyToId(executor, '2:255')).toBe(kursiy.id);
    expect(idToVerseKey(executor, kursiy.id)).toBe('2:255');
    expect(verseKeyToId(executor, "2:255' OR '1'='1")).toBeUndefined();
    expect(idToVerseKey(executor, 0)).toBeUndefined();
    expect(getVerseByKey(executor, '0:0')).toBeUndefined();
  });
});

describe('words', () => {
  it('returns Uthmani and Imlaei words, including the end row, byte for byte', () => {
    const verse = requiredVerse('2:255');
    const words = getWords(executor, verse.id);
    const stored = requireSeed()
      .prepare(
        'SELECT position, char_type AS charType, text_uthmani AS textUthmani, text_imlaei AS textImlaei FROM words WHERE verse_id = ? ORDER BY position',
      )
      .all(verse.id) as { position: number; charType: string; textUthmani: string; textImlaei: string }[];

    expect(words.map((word) => word.position)).toEqual(stored.map((word) => word.position));
    expect(words.map((word) => word.charType)).toEqual(stored.map((word) => word.charType));
    words.forEach((word, index) => {
      expectSameText(word.textUthmani, stored[index]?.textUthmani ?? null);
      expectSameText(word.textImlaei, stored[index]?.textImlaei ?? null);
    });
    expect(words.some((word) => word.charType === 'word')).toBe(true);
    expect(words[words.length - 1]?.charType).toBe('end');
    expect(words.filter((word) => word.charType === 'word').map((word) => word.textUthmani).join(' ')).toBe(verse.textUthmani);
  });
});

describe('mushaf pages', () => {
  it('groups a surah-boundary page by line and keeps glyphs byte for byte', () => {
    expect(isPageInstalled(executor, MUSHAF_ID, fixture.boundaryPage)).toBe(true);
    expect(isPageInstalled(executor, MUSHAF_ID, 1)).toBe(false);
    expect(isPageInstalled(executor, MUSHAF_ID + 1, fixture.boundaryPage)).toBe(false);

    const lines = getMushafPage(executor, MUSHAF_ID, fixture.boundaryPage);
    expect(lines.map((line) => line.line)).toEqual([3, 7]);
    expect(lines[0]?.words.map((word) => word.positionInLine)).toEqual([1, 2]);
    expect(lines[0]?.words.map((word) => word.verseId)).toEqual([fixture.firstVerseId, fixture.firstVerseId]);
    expect(lines[1]?.words.map((word) => word.verseId)).toEqual([fixture.lastVerseId]);
    expect(lines[1]?.words[0]?.charType).toBe('end');
    expectSameText(lines[0]?.words[0]?.glyph ?? null, GLYPH_LEADING);
    expectSameText(lines[0]?.words[1]?.glyph ?? null, GLYPH_MIDDLE);
    expectSameText(lines[1]?.words[0]?.glyph ?? null, GLYPH_END);
    expect(new Set(lines.flatMap((line) => line.words.map((word) => word.verseId))).size).toBe(2);
    expect(getMushafPage(executor, MUSHAF_ID, 1)).toEqual([]);

    const stored = requireDatabase()
      .prepare(
        `SELECT mushafs.name AS name, mushaf_pages.verse_mapping AS verse_mapping
         FROM mushafs
         JOIN mushaf_pages ON mushaf_pages.mushaf_id = mushafs.id
         WHERE mushafs.id = ?`,
      )
      .get(MUSHAF_ID) as { name: string; verse_mapping: string } | undefined;
    expectSameText(stored?.name ?? null, MUSHAF_NAME);
    expectSameText(stored?.verse_mapping ?? null, VERSE_MAPPING);
  });
});

describe('translations and tafsir', () => {
  it('returns installed translations and stored text, including footnotes', () => {
    expect(getTranslations(executor, [], [TRANSLATION_A])).toEqual([]);
    expect(getTranslations(executor, [fixture.kursiyId], [])).toEqual([]);
    expect(getTranslations(executor, [fixture.kursiyId], [TRANSLATION_A, TRANSLATION_B])).toEqual([
      { resourceId: TRANSLATION_A, verseId: fixture.kursiyId, text: PADDED_KURSIY, footnotes: FOOTNOTES },
      { resourceId: TRANSLATION_B, verseId: fixture.kursiyId, text: PADDED_OPENING, footnotes: null },
    ]);

    const opening = getTranslations(executor, [1, fixture.kursiyId], [TRANSLATION_A]);
    expect(opening.map((entry) => entry.verseId)).toEqual([1, fixture.kursiyId]);
    expectSameText(opening[0]?.text ?? null, PADDED_OPENING);
    expect(opening[0]?.footnotes).toBeNull();
    expectSameText(opening[1]?.text ?? null, PADDED_KURSIY);
    expectSameText(opening[1]?.footnotes ?? null, FOOTNOTES);

    expect(listInstalledTranslations(executor)).toEqual([
      {
        resourceId: TRANSLATION_A,
        group: 'translations',
        version: 2,
        sha256: SHA_A,
        lastCheckedAt: CHECKED_AT,
        changeCursor: null,
      },
      {
        resourceId: TRANSLATION_B,
        group: 'translations',
        version: 4,
        sha256: SHA_B,
        lastCheckedAt: CHECKED_AT,
        changeCursor: CURSOR,
      },
    ]);
  });

  it('returns the tafsir entry whose range covers the verse', () => {
    expect(getTafsirForVerse(executor, TAFSIR_ID, fixture.fatihaEndId)).toBeUndefined();
    expect(getTafsirForVerse(executor, TAFSIR_ID, fixture.baqarahStartId)?.html).toBe(TAFSIR_HTML);
    expect(getTafsirForVerse(executor, TAFSIR_ID, fixture.narrowStartId - 1)?.html).toBe(TAFSIR_HTML);
    expectSameText(getTafsirForVerse(executor, TAFSIR_ID, fixture.narrowStartId)?.html ?? null, NARROW_HTML);
    expectSameText(getTafsirForVerse(executor, TAFSIR_ID, fixture.kursiyId)?.html ?? null, NARROW_HTML);
    expect(getTafsirForVerse(executor, TAFSIR_ID, fixture.afterKursiyId)?.html).toBe(AFTER_HTML);
    expect(getTafsirForVerse(executor, TAFSIR_ID, fixture.afterKursiyId)?.firstVerseId).toBe(fixture.afterKursiyId);
    expect(getTafsirForVerse(executor, TRANSLATION_A, fixture.kursiyId)).toBeUndefined();

    expect(listInstalledTafsirs(executor)).toEqual([
      {
        resourceId: TAFSIR_ID,
        group: 'tafsirs',
        version: 3,
        sha256: SHA_TAFSIR,
        lastCheckedAt: CHECKED_AT,
        changeCursor: null,
      },
    ]);
  });
});

describe('query plans', () => {
  it('prepares parameters and uses the page and mushaf indexes', () => {
    const recorded = recordingExecutor(executor);
    getVerseByKey(recorded, '2:255');
    getVersesByPage(recorded, fixture.boundaryPage);
    getMushafPage(recorded, MUSHAF_ID, fixture.boundaryPage);
    getTafsirForVerse(recorded, TAFSIR_ID, fixture.kursiyId);
    getTranslations(recorded, [], [TRANSLATION_A]);

    const byKey = recorded.queries[0];
    const byPage = recorded.queries[1];
    const byMushaf = recorded.queries[2];
    const byTafsir = recorded.queries[3];
    expect(byKey?.params).toEqual(['2:255']);
    expect(byKey?.sql).not.toContain('2:255');
    expect(byPage).toBeDefined();
    expect(byMushaf).toBeDefined();
    expect(byTafsir).toBeDefined();
    expect(recorded.queries).toHaveLength(4);

    if (byPage === undefined || byMushaf === undefined || byTafsir === undefined) {
      throw new Error('Expected prepared reader queries.');
    }
    expect(queryPlan(executor, byPage.sql, byPage.params)).toContain('verses_page_idx');
    expect(queryPlan(executor, byMushaf.sql, byMushaf.params)).toContain('word_layouts_mushaf_page_line_idx');
    expect(queryPlan(executor, byTafsir.sql, byTafsir.params)).toContain('tafsir_entries_resource_first_verse_idx');
  });
});

function requiredVerse(key: string): { id: number; textUthmani: string } {
  const verse = getVerseByKey(executor, key);
  if (verse === undefined) {
    throw new Error(`Missing verse ${key}.`);
  }
  return verse;
}

function boundaryPageOf(db: SqlExecutor): number {
  const row = db.get<{ page: number }>(
    `SELECT page
     FROM verses
     GROUP BY page
     HAVING COUNT(DISTINCT chapter_id) > 1
     ORDER BY page
     LIMIT 1`,
  );
  if (row === undefined) {
    throw new Error('Seed has no page that crosses a surah boundary.');
  }
  return row.page;
}

function installPacks(db: SqlExecutor, rows: Fixture): void {
  installPack(db, {
    resourceId: TRANSLATION_A,
    group: 'translations',
    version: 2,
    sha256: SHA_A,
    fill(pack) {
      const insert = pack.prepare(
        'INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (?, ?, ?, ?)',
      );
      insert.run(TRANSLATION_A, 1, PADDED_OPENING, null);
      insert.run(TRANSLATION_A, rows.kursiyId, PADDED_KURSIY, FOOTNOTES);
    },
  });
  installPack(db, {
    resourceId: TRANSLATION_B,
    group: 'translations',
    version: 4,
    sha256: SHA_B,
    fill(pack) {
      pack
        .prepare('INSERT INTO translation_entries (resource_id, verse_id, text, footnotes) VALUES (?, ?, ?, ?)')
        .run(TRANSLATION_B, rows.kursiyId, PADDED_OPENING, null);
    },
  });
  db.run('UPDATE installed_resources SET change_cursor = ? WHERE resource_id = ?', [CURSOR, TRANSLATION_B]);

  installPack(db, {
    resourceId: TAFSIR_ID,
    group: 'tafsirs',
    version: 3,
    sha256: SHA_TAFSIR,
    fill(pack) {
      const insert = pack.prepare(
        'INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, ?, ?, ?, ?)',
      );
      insert.run(TAFSIR_ID, 1, rows.baqarahStartId, rows.kursiyId, TAFSIR_HTML);
      insert.run(TAFSIR_ID, 2, rows.narrowStartId, rows.kursiyId, NARROW_HTML);
      insert.run(TAFSIR_ID, 3, rows.afterKursiyId, rows.afterKursiyId + 4, AFTER_HTML);
    },
  });

  installPack(db, {
    resourceId: MUSHAF_RESOURCE,
    group: 'mushafs',
    version: 1,
    sha256: SHA_MUSHAF,
    fill(pack) {
      pack
        .prepare(
          'INSERT INTO mushafs (id, resource_id, name, pages_count, lines_per_page, default_font_name) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(MUSHAF_ID, MUSHAF_RESOURCE, MUSHAF_NAME, 604, 15, null);
      pack
        .prepare(
          `INSERT INTO mushaf_pages (
             mushaf_id, page_number, first_verse_id, last_verse_id, first_word_id, last_word_id, verse_mapping
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(MUSHAF_ID, rows.boundaryPage, rows.firstVerseId, rows.lastVerseId, 1, 3, VERSE_MAPPING);
      const insert = pack.prepare(
        `INSERT INTO word_layouts (
           mushaf_id, word_id, verse_id, position_in_verse, char_type, glyph, page, line, position_in_line
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      insert.run(MUSHAF_ID, 3, rows.lastVerseId, 1, 'end', GLYPH_END, rows.boundaryPage, 7, 1);
      insert.run(MUSHAF_ID, 2, rows.firstVerseId, 2, 'word', GLYPH_MIDDLE, rows.boundaryPage, 3, 2);
      insert.run(MUSHAF_ID, 1, rows.firstVerseId, 1, 'word', GLYPH_LEADING, rows.boundaryPage, 3, 1);
    },
  });
}

function installPack(
  db: SqlExecutor,
  spec: {
    resourceId: number;
    group: Extract<PackGroup, 'translations' | 'tafsirs' | 'mushafs'>;
    version: number;
    sha256: string;
    fill: (pack: DatabaseSync) => void;
  },
): void {
  const group = contentGroup(spec.group);
  if (group === undefined) {
    throw new Error(`Missing pack group ${spec.group}.`);
  }

  const directory = mkdtempSync(join(tmpdir(), 'reader-pack-'));
  const path = join(directory, 'pack.sqlite');
  const pack = new DatabaseSync(path);
  pack.exec('PRAGMA journal_mode = DELETE');
  pack.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  pack.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('pack_schema_version', '1');
  pack.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('resource_id', String(spec.resourceId));
  for (const table of group.tables) {
    const primaryKey = PRIMARY_KEYS[table.name];
    if (primaryKey === undefined) {
      throw new Error(`Missing primary key for ${table.name}.`);
    }
    const columns = table.columns
      .map((column) => `${column.name} ${column.kind === 'integer' ? 'INTEGER' : 'TEXT'}${column.nullable ? '' : ' NOT NULL'}`)
      .join(', ');
    pack.exec(`CREATE TABLE ${table.name} (${columns}, PRIMARY KEY (${primaryKey}))`);
  }
  spec.fill(pack);
  pack.close();

  let attached = false;
  try {
    db.exec(`ATTACH DATABASE ${sqlString(path)} AS pack`);
    attached = true;
    db.transaction(() => {
      for (const table of group.tables) {
        const columns = columnList(table);
        db.exec(`INSERT INTO ${table.name} (${columns}) SELECT ${columns} FROM pack.${table.name}`);
      }
      db.run(
        `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        [spec.resourceId, spec.group, spec.version, spec.sha256, CHECKED_AT],
      );
    });
  } finally {
    if (attached) {
      db.exec('DETACH DATABASE pack');
    }
    rmSync(directory, { force: true, recursive: true });
  }
}

function recordingExecutor(inner: SqlExecutor): SqlExecutor & { queries: Query[] } {
  const queries: Query[] = [];
  return {
    queries,
    exec(sql) {
      inner.exec(sql);
    },
    run(sql, params) {
      inner.run(sql, params);
    },
    get(sql, params = []) {
      queries.push({ sql, params: [...params] });
      return inner.get(sql, params);
    },
    all(sql, params = []) {
      queries.push({ sql, params: [...params] });
      return inner.all(sql, params);
    },
    transaction(fn) {
      return inner.transaction(fn);
    },
  };
}

function queryPlan(db: SqlExecutor, sql: string, params: readonly SqlValue[]): string {
  return db
    .all<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, params)
    .map((row) => row.detail)
    .join('\n');
}

function requireDatabase(): DatabaseSync {
  if (database === undefined) {
    throw new Error('Content database is not open.');
  }
  return database;
}

function requireSeed(): DatabaseSync {
  if (seed === undefined) {
    throw new Error('Seed database is not open.');
  }
  return seed;
}

function seedRow<T>(sql: string, ...params: SqlValue[]): T {
  const row = requireSeed().prepare(sql).get(...params) as T | undefined;
  if (row === undefined) {
    throw new Error('Seed row is missing.');
  }
  return row;
}

function expectSameText(actual: string | null | undefined, expected: string | null): void {
  expect(actual).toBe(expected);
  if (typeof actual === 'string' && expected !== null) {
    expect([...new TextEncoder().encode(actual)]).toEqual([...new TextEncoder().encode(expected)]);
  }
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
