import type { DatabaseSync } from 'node:sqlite';

import { clearLocalUserData } from '@/core/db/user/clear';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { isFavorite, listFavorites, toggleFavorite } from './favorites-repository';
import { recordTap } from './progress-repository';

describe('favourites repository', () => {
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

  it('toggles an entry on and off', () => {
    const store = { db: executor, now: () => 1_000 };

    expect(toggleFavorite('fixture:entry-001', store)).toBe(true);
    expect(isFavorite('fixture:entry-001', { db: executor })).toBe(true);

    expect(toggleFavorite('fixture:entry-001', store)).toBe(false);
    expect(isFavorite('fixture:entry-001', { db: executor })).toBe(false);
    expect(listFavorites({ db: executor })).toEqual([]);
  });

  it('lists favourites newest first', () => {
    toggleFavorite('fixture:entry-001', { db: executor, now: () => 1_000 });
    toggleFavorite('fixture:entry-003', { db: executor, now: () => 3_000 });
    toggleFavorite('fixture:entry-002', { db: executor, now: () => 2_000 });

    expect(listFavorites({ db: executor }).map((favorite) => favorite.entryKey)).toEqual([
      'fixture:entry-003',
      'fixture:entry-002',
      'fixture:entry-001',
    ]);
  });

  it('writes nothing to the outbox: favourites are local only', () => {
    toggleFavorite('fixture:entry-001', { db: executor, now: () => 1_000 });

    const outbox = database.prepare('SELECT count(*) AS count FROM outbox').get() as { count: number };
    expect(outbox.count).toBe(0);
  });

  it('is cleared with the other personal data, with progress', () => {
    toggleFavorite('fixture:entry-001', { db: executor, now: () => 1_000 });
    recordTap('category:morning', '2026-10-31', 'fixture:item-001', 3, { db: executor, now: () => 2_000 });

    clearLocalUserData(executor);

    expect(listFavorites({ db: executor })).toEqual([]);
    const progress = database.prepare('SELECT count(*) AS count FROM azkar_progress').get() as { count: number };
    expect(progress.count).toBe(0);
  });
});
