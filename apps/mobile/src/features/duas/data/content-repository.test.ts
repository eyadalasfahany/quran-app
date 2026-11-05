import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import {
  getPropheticDua,
  getQuranicDua,
  getQuranicDuaVerses,
  listPropheticDuaSections,
  listQuranicDuas,
  neighbourPropheticDuas,
  neighbourQuranicDuas,
} from './content-repository';

const FIXTURE_VERSE = 'FIXTURE VERSE 1:1 — not a dua';

const FIXTURE_HADITH = 'FIXTURE text 1 — not a dua';

function seedPropheticRows(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO dua_groups (resource_id, id, source_category_id, title, position)
     VALUES (50, 1, 301, 'FIXTURE group title', 1)`,
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (50, 10, 'hadeethenc:1', 'hadith', 1, 10),
            (50, 11, 'hadeethenc:2', 'hadith', 1, 11)`,
  );
  executor.run(
    `INSERT INTO dua_hadith (resource_id, item_id, hadeeth_id, title, hadeeth, attribution, grade, explanation, reference, hints, text_search, source_url)
     VALUES (50, 10, 1, 'FIXTURE title 1', ?, 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/1'),
            (50, 11, 2, 'FIXTURE title 2', 'FIXTURE text 2 — not a dua', 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/2')`,
    [FIXTURE_HADITH],
  );
}

function seedDuasPack(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at)
     VALUES (50, 'duas', 1, 'fixture', 0)`,
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (50, 1, 'quran:1:1', 'quran', NULL, 1),
            (50, 2, 'quran:1:2', 'quran', NULL, 2)`,
  );
  executor.run(
    `INSERT INTO dua_quran_spans (resource_id, item_id, surah, verse_from, verse_to)
     VALUES (50, 1, 1, 1, 1),
            (50, 2, 1, 2, 2)`,
  );
}

function insertVerse(database: DatabaseSync): void {
  database.prepare(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
     VALUES (101, '1:1', 1, 1, 1, 1, 1, 1, 'none', ?, 'fixture')`,
  ).run(FIXTURE_VERSE);
  database.prepare(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end)
     VALUES (1, 'FIXTURE chapter ar', 'FIXTURE chapter', 'FIXTURE chapter en', 'makkah', 1, 7, 1, 1, 1)`,
  ).run();
  database.prepare(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
     VALUES (102, '1:2', 1, 2, 1, 1, 1, 1, 'none', 'FIXTURE VERSE 1:2 — not a dua', 'fixture')`,
  ).run();
}

describe('duas content repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    insertVerse(database);
    seedDuasPack(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('lists Quranic duas in Mushaf order', () => {
    const rows = listQuranicDuas(executor);
    expect(rows.map((row) => row.duaKey)).toEqual(['quran:1:1', 'quran:1:2']);
  });

  it('resolves verse text byte-for-byte from verses', () => {
    const dua = getQuranicDua(executor, 'quran:1:1');
    expect(dua).toBeDefined();
    const verses = getQuranicDuaVerses(executor, at([dua!], 0));
    expect(verses[0]?.textUthmani).toBe(FIXTURE_VERSE);
  });

  it('returns neighbours by position', () => {
    const dua = getQuranicDua(executor, 'quran:1:2');
    expect(neighbourQuranicDuas(executor, dua!.position)).toEqual({
      previous: 'quran:1:1',
      next: null,
    });
  });

  it('returns an empty list when no pack is installed', () => {
    executor.run(`DELETE FROM installed_resources WHERE "group" = 'duas'`);
    expect(listQuranicDuas(executor)).toEqual([]);
  });

  it('lists prophetic sections by group title', () => {
    seedPropheticRows(executor);
    const sections = listPropheticDuaSections(executor);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe('FIXTURE group title');
    expect(sections[0]?.items.map((row) => row.duaKey)).toEqual(['hadeethenc:1', 'hadeethenc:2']);
  });

  it('loads prophetic detail byte-for-byte', () => {
    seedPropheticRows(executor);
    const detail = getPropheticDua(executor, 'hadeethenc:1');
    expect(detail?.hadeeth).toBe(FIXTURE_HADITH);
    expect(detail?.index).toBe(1);
  });

  it('returns prophetic neighbours within kind', () => {
    seedPropheticRows(executor);
    expect(neighbourPropheticDuas(executor, 11)).toEqual({
      previous: 'hadeethenc:1',
      next: null,
    });
  });

  it('maps stored hints JSON to a list of hints', () => {
    seedPropheticRows(executor);
    executor.run(`UPDATE dua_hadith SET hints = ? WHERE item_id = 10`, [JSON.stringify(['FIXTURE hint 1 — not a dua', 'FIXTURE hint 2 — not a dua'])]);
    expect(getPropheticDua(executor, 'hadeethenc:1')?.hints).toEqual(['FIXTURE hint 1 — not a dua', 'FIXTURE hint 2 — not a dua']);
  });

  it('maps missing hints to an empty list', () => {
    seedPropheticRows(executor);
    expect(getPropheticDua(executor, 'hadeethenc:1')?.hints).toEqual([]);
  });
});
