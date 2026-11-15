import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { HISN_FIXTURE_RESOURCE_ID, seedHisnFixture } from '../../../../jest/hisn-dua-fixtures';
import { listHisnDuaEntries, listHisnDuaTopics } from './duas-bridge';

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
