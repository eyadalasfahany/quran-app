import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { isDuaFavorite, listDuaFavorites, toggleDuaFavorite } from './favorites-repository';

describe('dua favourites repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarUserDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('toggles a dua on and off, returning whether it is a favourite afterwards', () => {
    const store = { db: executor, now: () => 1_000 };

    expect(toggleDuaFavorite('quran:1:1', store)).toBe(true);
    expect(isDuaFavorite('quran:1:1', { db: executor })).toBe(true);

    expect(toggleDuaFavorite('quran:1:1', store)).toBe(false);
    expect(isDuaFavorite('quran:1:1', { db: executor })).toBe(false);
    expect(listDuaFavorites({ db: executor })).toEqual([]);
  });

  it('lists dua favourites newest first', () => {
    toggleDuaFavorite('quran:1:1', { db: executor, now: () => 1_000 });
    toggleDuaFavorite('hadeethenc:1', { db: executor, now: () => 3_000 });
    toggleDuaFavorite('quran:1:2', { db: executor, now: () => 2_000 });

    expect(listDuaFavorites({ db: executor }).map((favorite) => favorite.duaKey)).toEqual([
      'hadeethenc:1',
      'quran:1:2',
      'quran:1:1',
    ]);
  });
});
