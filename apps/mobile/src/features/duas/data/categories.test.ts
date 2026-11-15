import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { seedHisnFixture } from '../../../../jest/hisn-dua-fixtures';
import { listDuaCategories, listDuaCategoryItems, parseDuaCategoryId } from './categories';

const DUAS_RESOURCE_ID = 50;

/** A quranic-reference formatter for the tests: the surah and verse numbers, never verse text. */
const fakeReference = (ref: { surah: number; verseFrom: number; verseTo: number }) =>
  `FIXTURE ref ${ref.surah}:${ref.verseFrom}-${ref.verseTo}`;

/**
 * Installs a `duas` pack: two Quranic duas, three HadeethEnc groups (the second is empty and must not be listed), and
 * three prophetic duas. Every title and text is a placeholder.
 */
function seedDuasPack(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'duas', 1, 'fixture', 0)`,
    [DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (?, 1, 'quran:1:1', 'quran', NULL, 1), (?, 2, 'quran:1:2', 'quran', NULL, 2)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_quran_spans (resource_id, item_id, surah, verse_from, verse_to)
     VALUES (?, 1, 1, 1, 1), (?, 2, 1, 2, 2)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_groups (resource_id, id, source_category_id, title, position)
     VALUES (?, 1, 301, 'FIXTURE group one', 1), (?, 2, 302, 'FIXTURE group two (empty)', 2), (?, 3, 303, 'FIXTURE group three', 3)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (?, 10, 'hadeethenc:1', 'hadith', 1, 10), (?, 11, 'hadeethenc:2', 'hadith', 1, 11), (?, 12, 'hadeethenc:3', 'hadith', 3, 12)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_hadith (resource_id, item_id, hadeeth_id, title, hadeeth, attribution, grade, explanation, reference, hints, text_search, source_url)
     VALUES (?, 10, 1, 'FIXTURE title 1', 'FIXTURE text 1 — not a dua', 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/1'),
            (?, 11, 2, 'FIXTURE title 2', 'FIXTURE text 2 — not a dua', 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/2'),
            (?, 12, 3, 'FIXTURE title 3', 'FIXTURE text 3 — not a dua', 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/3')`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
}

describe('duas categories', () => {
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

  describe('listDuaCategories', () => {
    it('lists the Quran, the HadeethEnc groups with items, then the Hisn topics with duas, in that order', () => {
      seedDuasPack(executor);
      seedHisnFixture(executor);

      const categories = listDuaCategories(executor);

      expect(categories.map((category) => category.id)).toEqual([
        'quran',
        'hadeethenc:1',
        'hadeethenc:3',
        'hisn:browse-a',
        'hisn:browse-b',
      ]);
    });

    it('names the Quran and Hisn categories by i18n key, and a HadeethEnc group by its title as received', () => {
      seedDuasPack(executor);
      seedHisnFixture(executor);

      const categories = listDuaCategories(executor);

      expect(at(categories, 0)).toEqual({
        id: 'quran',
        kind: 'quran',
        titleKey: 'duas.categories.quran',
        title: null,
        count: 2,
        sourceKind: 'duas',
      });
      expect(at(categories, 1)).toEqual({
        id: 'hadeethenc:1',
        kind: 'hadeethenc',
        titleKey: null,
        title: 'FIXTURE group one',
        count: 2,
        sourceKind: 'duas',
      });
      expect(at(categories, 3)).toEqual({
        id: 'hisn:browse-a',
        kind: 'hisn',
        titleKey: 'azkar.categories.browse-a',
        title: null,
        count: 2,
        sourceKind: 'azkar',
      });
    });

    it('lists no Hisn category when no azkar pack is installed (no dead ends)', () => {
      seedDuasPack(executor);
      seedHisnFixture(executor);
      executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);

      const categories = listDuaCategories(executor);

      expect(categories.filter((category) => category.kind === 'hisn')).toEqual([]);
      expect(categories.map((category) => category.id)).toEqual(['quran', 'hadeethenc:1', 'hadeethenc:3']);
    });

    it('lists no Quran or HadeethEnc category when the duas pack is missing', () => {
      seedHisnFixture(executor);

      const categories = listDuaCategories(executor);

      expect(categories.map((category) => category.id)).toEqual(['hisn:browse-a', 'hisn:browse-b']);
    });

    it('lists nothing when no pack is installed', () => {
      expect(listDuaCategories(executor)).toEqual([]);
    });

    it('leaves out a topic with only session or non-dua entries', () => {
      seedHisnFixture(executor);

      const ids = listDuaCategories(executor).map((category) => category.id);

      // browse-c holds only a dua that is in a session; browse-d a dhikr; browse-empty nothing; session-x is no topic.
      expect(ids).not.toContain('hisn:browse-c');
      expect(ids).not.toContain('hisn:browse-d');
      expect(ids).not.toContain('hisn:browse-empty');
      expect(ids).not.toContain('hisn:session-x');
    });

    it('gives a moved entry its category in both of its topics', () => {
      seedHisnFixture(executor);

      const hisn = listDuaCategories(executor).filter((category) => category.kind === 'hisn');

      expect(hisn.map((category) => [category.id, category.count])).toEqual([
        ['hisn:browse-a', 2],
        ['hisn:browse-b', 1],
      ]);
    });

    it('counts each category as the number of its listed items', () => {
      seedDuasPack(executor);
      seedHisnFixture(executor);

      for (const category of listDuaCategories(executor)) {
        expect(category.count).toBe(listDuaCategoryItems(executor, category.id, fakeReference).length);
      }
    });
  });

  describe('listDuaCategoryItems', () => {
    it('lists the Quranic duas as references only, in Mushaf order', () => {
      seedDuasPack(executor);

      expect(listDuaCategoryItems(executor, 'quran', fakeReference)).toEqual([
        { kind: 'quran', duaKey: 'quran:1:1', quranReference: 'FIXTURE ref 1:1-1' },
        { kind: 'quran', duaKey: 'quran:1:2', quranReference: 'FIXTURE ref 1:2-2' },
      ]);
    });

    it('gives a Quranic card no reference when no formatter is passed', () => {
      seedDuasPack(executor);

      expect(at(listDuaCategoryItems(executor, 'quran'), 0)).toEqual({
        kind: 'quran',
        duaKey: 'quran:1:1',
        quranReference: null,
      });
    });

    it('lists a HadeethEnc group by its dua titles', () => {
      seedDuasPack(executor);

      expect(listDuaCategoryItems(executor, 'hadeethenc:1')).toEqual([
        { kind: 'hadith', duaKey: 'hadeethenc:1', preview: 'FIXTURE title 1' },
        { kind: 'hadith', duaKey: 'hadeethenc:2', preview: 'FIXTURE title 2' },
      ]);
    });

    it('lists the Hisn duas of a topic with their Azkar preview, references and book number', () => {
      seedHisnFixture(executor);

      const items = listDuaCategoryItems(executor, 'hisn:browse-a');

      expect(items.map((item) => item.kind)).toEqual(['hisn', 'hisn']);
      expect(at(items, 0)).toEqual({
        kind: 'hisn',
        entryKey: 'FIXTURE:entry-1',
        chapterTitle: 'FIXTURE chapter 1',
        preview: 'FIXTURE text 1 — not a dua',
        quranRefs: [{ surah: 1, verseFrom: 2, verseTo: 4 }],
        bookNumber: 'FIXTURE-REF-1',
      });
    });

    it('lists a moved Hisn dua in each of its topics', () => {
      seedHisnFixture(executor);

      const keys = (id: string) =>
        listDuaCategoryItems(executor, id).map((item) => (item.kind === 'hisn' ? item.entryKey : null));

      expect(keys('hisn:browse-a')).toContain('FIXTURE:entry-1');
      expect(keys('hisn:browse-b')).toContain('FIXTURE:entry-1');
    });

    it('returns no items for an empty HadeethEnc group, an unknown id or a malformed id', () => {
      seedDuasPack(executor);
      seedHisnFixture(executor);

      expect(listDuaCategoryItems(executor, 'hadeethenc:2')).toEqual([]);
      expect(listDuaCategoryItems(executor, 'hisn:browse-c')).toEqual([]);
      expect(listDuaCategoryItems(executor, 'hadeethenc:abc')).toEqual([]);
      expect(listDuaCategoryItems(executor, 'nope')).toEqual([]);
    });
  });

  describe('parseDuaCategoryId', () => {
    it('reads the three id forms and rejects the rest', () => {
      expect(parseDuaCategoryId('quran')).toEqual({ kind: 'quran' });
      expect(parseDuaCategoryId('hadeethenc:12')).toEqual({ kind: 'hadeethenc', groupId: 12 });
      expect(parseDuaCategoryId('hisn:browse-a')).toEqual({ kind: 'hisn', topicId: 'browse-a' });
      expect(parseDuaCategoryId('hadeethenc:x')).toBeNull();
      expect(parseDuaCategoryId('hisn:')).toBeNull();
      expect(parseDuaCategoryId('session-x')).toBeNull();
    });
  });
});
