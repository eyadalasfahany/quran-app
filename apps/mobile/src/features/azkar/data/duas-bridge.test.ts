import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { HISN_FIXTURE_RESOURCE_ID, seedHisnFixture } from '../../../../jest/hisn-dua-fixtures';
import { listHisnDuaEntries, listHisnDuaFavorites, listHisnDuaTopics } from './duas-bridge';

describe('azkar duas bridge', () => {
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

  describe('without an azkar pack', () => {
    it('lists no topics and no entries', () => {
      expect(listHisnDuaTopics(executor)).toEqual([]);
      expect(listHisnDuaEntries(executor, 'browse-a')).toEqual([]);
    });

    it('lists no topics when azkar rows exist but no azkar pack is registered', () => {
      seedHisnFixture(executor);
      executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);

      expect(listHisnDuaTopics(executor)).toEqual([]);
      expect(listHisnDuaEntries(executor, 'browse-a')).toEqual([]);
    });
  });

  describe('with an azkar pack', () => {
    beforeEach(() => {
      seedHisnFixture(executor);
    });

    it('lists only browse topics that hold a Hisn dua, in position order', () => {
      expect(listHisnDuaTopics(executor)).toEqual([
        { id: 'browse-a', position: 1, count: 2 },
        { id: 'browse-b', position: 2, count: 1 },
      ]);
    });

    it('leaves out a topic with only session or non-dua entries', () => {
      const ids = listHisnDuaTopics(executor).map((topic) => topic.id);

      // browse-c holds only an entry that is in a session; browse-d holds only a dhikr; browse-empty holds nothing.
      expect(ids).not.toContain('browse-c');
      expect(ids).not.toContain('browse-d');
      expect(ids).not.toContain('browse-empty');
    });

    it('never lists a session category as a topic', () => {
      expect(listHisnDuaTopics(executor).map((topic) => topic.id)).not.toContain('session-x');
    });

    it('counts each Hisn dua once per topic, and matches the entries listed', () => {
      for (const topic of listHisnDuaTopics(executor)) {
        expect(topic.count).toBe(listHisnDuaEntries(executor, topic.id).length);
      }
    });

    it('lists a moved entry in both of its topics', () => {
      expect(listHisnDuaEntries(executor, 'browse-a').map((entry) => entry.entryKey)).toEqual([
        'FIXTURE:entry-1',
        'FIXTURE:entry-2',
      ]);
      expect(listHisnDuaEntries(executor, 'browse-b').map((entry) => entry.entryKey)).toEqual(['FIXTURE:entry-1']);
    });

    it('counts a dua linked twice to one topic once', () => {
      executor.run(
        `INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position) VALUES (?, 'browse-a', 1, 'default', 9)`,
        [HISN_FIXTURE_RESOURCE_ID],
      );

      expect(listHisnDuaTopics(executor).find((topic) => topic.id === 'browse-a')?.count).toBe(2);
      expect(listHisnDuaEntries(executor, 'browse-a')).toHaveLength(2);
    });

    it('never lists a dhikr, even in a topic that also holds duas', () => {
      const keys = listHisnDuaEntries(executor, 'browse-b').map((entry) => entry.entryKey);
      expect(keys).not.toContain('FIXTURE:entry-3');
    });

    it('never lists a dua that is in a session, even when its home says duas', () => {
      expect(listHisnDuaEntries(executor, 'browse-c')).toEqual([]);
    });

    it('returns an empty list for an unknown topic', () => {
      expect(listHisnDuaEntries(executor, 'no-such-topic')).toEqual([]);
    });

    it('carries the preview, Quran references, chapter title and book number', () => {
      const first = at(listHisnDuaEntries(executor, 'browse-a'), 0);

      expect(first).toEqual({
        entryKey: 'FIXTURE:entry-1',
        chapterTitle: 'FIXTURE chapter 1',
        preview: 'FIXTURE text 1 — not a dua',
        quranRefs: [{ surah: 1, verseFrom: 2, verseTo: 4 }],
        bookNumber: 'FIXTURE-REF-1',
      });
    });

    it('carries a null preview and no references for an entry with neither', () => {
      const second = at(listHisnDuaEntries(executor, 'browse-a'), 1);

      expect(second.preview).toBe('FIXTURE text 2 — not a dua');
      expect(second.quranRefs).toEqual([]);
      expect(second.bookNumber).toBe('FIXTURE-REF-2');
    });

    it('reads a chapter title of null as null', () => {
      executor.run(`UPDATE azkar_chapters SET title_ar = NULL WHERE resource_id = ? AND id = 1`, [HISN_FIXTURE_RESOURCE_ID]);

      expect(at(listHisnDuaEntries(executor, 'browse-a'), 0).chapterTitle).toBeNull();
    });
  });
});

/**
 * Adds one Hisn dua (entry 20, in browse topic `browse-a`, home `duas`) whose steps are given in order: each step is
 * an item of kind `kind` with one text segment. Every text is a marked placeholder, never a dua.
 */
function addHisnDuaWithSteps(executor: SqlExecutor, steps: { kind: 'recitation' | 'instruction'; text: string }[]): void {
  const resourceId = HISN_FIXTURE_RESOURCE_ID;
  executor.run(
    `INSERT INTO azkar_entries (resource_id, id, entry_key, chapter_id, position, source_reference, entry_type, occasion,
       timing_type, timing_prayer, review_status, source_version, imported_at, home)
     VALUES (?, 20, 'FIXTURE:entry-20', 1, 9, 'FIXTURE-REF-20', 'invocation', NULL, NULL, NULL, 'sourced', 'fixture', 0, 'duas')`,
    [resourceId],
  );
  executor.run(`INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position) VALUES (?, 'browse-a', 20, '*', 99)`, [
    resourceId,
  ]);
  steps.forEach((step, index) => {
    const itemId = 200 + index;
    executor.run(
      `INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count)
       VALUES (?, ?, 20, ?, 'default', ?, ?, NULL)`,
      [resourceId, itemId, `FIXTURE:item-20-${index}`, index + 1, step.kind],
    );
    executor.run(
      `INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
       VALUES (?, ?, 1, 'text', ?, NULL, NULL, NULL, NULL)`,
      [resourceId, itemId, step.text],
    );
  });
}

describe('Hisn card preview from the recited text', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    seedHisnFixture(executor);
  });

  afterEach(() => {
    database.close();
  });

  const entry20 = () => listHisnDuaEntries(executor, 'browse-a').find((entry) => entry.entryKey === 'FIXTURE:entry-20');

  it('takes the recited text when the first step is an instruction', () => {
    addHisnDuaWithSteps(executor, [
      { kind: 'instruction', text: 'FIXTURE instruction — not a dua' },
      { kind: 'recitation', text: 'FIXTURE body — not a dua' },
    ]);

    expect(entry20()?.preview).toBe('FIXTURE body — not a dua');
  });

  it('skips a short lead-in fragment that ends with a colon and takes the recitation body after it', () => {
    addHisnDuaWithSteps(executor, [
      { kind: 'recitation', text: '…ويقول:' },
      { kind: 'recitation', text: 'FIXTURE body 2 — not a dua' },
    ]);

    expect(entry20()?.preview).toBe('FIXTURE body 2 — not a dua');
  });

  it('keeps a long text that happens to end with a colon', () => {
    const long = 'FIXTURE one two three four five six — not a dua:';
    addHisnDuaWithSteps(executor, [{ kind: 'recitation', text: long }]);

    expect(entry20()?.preview).toBe(long);
  });

  it('gives no preview when no recited step has text other than lead-ins', () => {
    addHisnDuaWithSteps(executor, [
      { kind: 'instruction', text: 'FIXTURE instruction — not a dua' },
      { kind: 'recitation', text: 'ويقول:' },
    ]);

    expect(entry20()?.preview).toBeNull();
  });

  it('builds the saved favourite preview the same way, with its topic', () => {
    addHisnDuaWithSteps(executor, [
      { kind: 'instruction', text: 'FIXTURE instruction — not a dua' },
      { kind: 'recitation', text: 'FIXTURE body 3 — not a dua' },
    ]);

    const [favorite] = listHisnDuaFavorites(executor, [{ entryKey: 'FIXTURE:entry-20', createdAt: 1 }]);
    expect(favorite).toMatchObject({ preview: 'FIXTURE body 3 — not a dua', topicId: 'browse-a' });
  });

  it('gives a favourite no topic when it is in no browse category', () => {
    addHisnDuaWithSteps(executor, [{ kind: 'recitation', text: 'FIXTURE body 4 — not a dua' }]);
    executor.run(`DELETE FROM azkar_entry_categories WHERE resource_id = ? AND entry_id = 20`, [HISN_FIXTURE_RESOURCE_ID]);

    const [favorite] = listHisnDuaFavorites(executor, [{ entryKey: 'FIXTURE:entry-20', createdAt: 1 }]);
    expect(favorite).toMatchObject({ topicId: null });
  });
});
