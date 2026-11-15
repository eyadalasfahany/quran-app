import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { seedHisnFixture } from '../../../../jest/hisn-dua-fixtures';
import { indexAzkarText } from '../../../../jest/duas-pack-fixtures';
import { listHisnDuaFavorites, searchHisnDuas } from './duas-bridge';

describe('searchHisnDuas and listHisnDuaFavorites', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    seedHisnFixture(executor);
    indexAzkarText(executor);
  });

  afterEach(() => {
    database.close();
  });

  describe('searchHisnDuas', () => {
    it('finds a Hisn dua by its text, under its first browse topic, with the match mapped', () => {
      const [hit] = searchHisnDuas(executor, 'text 1', 10);

      expect(hit).toMatchObject({ entryKey: 'FIXTURE:entry-1', topicId: 'browse-a', preview: 'FIXTURE text 1 — not a dua' });
      expect(hit?.highlight).toEqual({ start: 8, end: 14 });
    });

    it('lists each entry once, even when it sits in two topics', () => {
      const keys = searchHisnDuas(executor, 'FIXTURE', 10).map((hit) => hit.entryKey);

      expect(keys).toEqual(['FIXTURE:entry-1', 'FIXTURE:entry-2']);
    });

    it('never returns an entry in a session, or one that is not a dua', () => {
      expect(searchHisnDuas(executor, 'text 5', 10)).toEqual([]);
      expect(searchHisnDuas(executor, 'text 3', 10)).toEqual([]);
    });

    it('returns nothing for an empty query, and respects the limit', () => {
      expect(searchHisnDuas(executor, '  ', 10)).toEqual([]);
      expect(searchHisnDuas(executor, 'FIXTURE', 1)).toHaveLength(1);
    });

    it('returns nothing with no azkar pack installed', () => {
      executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);
      expect(searchHisnDuas(executor, 'text 1', 10)).toEqual([]);
    });
  });

  describe('listHisnDuaFavorites', () => {
    it('gives the Hisn duas among the favourites, in the order given, with their chapter and first text', () => {
      const cards = listHisnDuaFavorites(executor, [
        { entryKey: 'FIXTURE:entry-2', createdAt: 9 },
        { entryKey: 'FIXTURE:entry-1', createdAt: 8 },
      ]);

      expect(cards.map((card) => card.entryKey)).toEqual(['FIXTURE:entry-2', 'FIXTURE:entry-1']);
      expect(at(cards, 1)).toMatchObject({
        createdAt: 8,
        chapterTitle: 'FIXTURE chapter 1',
        preview: 'FIXTURE text 1 — not a dua',
        bookNumber: 'FIXTURE-REF-1',
      });
    });

    it('skips an entry that is not a Hisn dua now, is in a session, or is gone', () => {
      const cards = listHisnDuaFavorites(executor, [
        { entryKey: 'FIXTURE:entry-3', createdAt: 1 },
        { entryKey: 'FIXTURE:entry-5', createdAt: 2 },
        { entryKey: 'FIXTURE:gone', createdAt: 3 },
      ]);

      expect(cards).toEqual([]);
    });

    it('returns nothing with no azkar pack installed', () => {
      executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);

      expect(listHisnDuaFavorites(executor, [{ entryKey: 'FIXTURE:entry-1', createdAt: 1 }])).toEqual([]);
    });
  });
});
