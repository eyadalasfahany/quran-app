import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { listFavoriteCards } from './favorite-cards';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';

describe('listFavoriteCards', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    loadAzkarDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('keeps the given order and reads the occasion and preview of each entry', () => {
    const cards = listFavoriteCards(executor, [
      { entryKey: 'fixture:entry-003', createdAt: 2 },
      { entryKey: 'fixture:entry-001', createdAt: 1 },
    ]);

    expect(cards.map((card) => card.entryKey)).toEqual(['fixture:entry-003', 'fixture:entry-001']);
    expect(cards[0]).toMatchObject({ occasion: 'evening' });
    expect(cards[1]?.preview).toBe('نص تجريبي ١ — ليس ذكرًا');
  });

  it('skips a favourite whose entry no longer exists', () => {
    expect(listFavoriteCards(executor, [{ entryKey: 'fixture:gone', createdAt: 1 }])).toEqual([]);
  });
});
