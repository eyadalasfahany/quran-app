import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb, openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { getEntry } from './content-repository';
import { listFavoriteCards } from './favorite-cards';
import { isFavorite, listFavorites, toggleFavorite } from './favorites-repository';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { getProgressRows, recordTap } from './progress-repository';

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

  it('keeps the Quran references of an entry that also has a text preview', () => {
    const [card] = listFavoriteCards(executor, [{ entryKey: 'fixture:entry-002', createdAt: 1 }]);

    expect(card).toMatchObject({ preview: 'نص تجريبي ٣ — ليس ذكرًا', quranRefs: [{ surah: 1, verseFrom: 1, verseTo: 1 }] });
  });

  it('skips a favourite whose entry no longer exists', () => {
    expect(listFavoriteCards(executor, [{ entryKey: 'fixture:gone', createdAt: 1 }])).toEqual([]);
  });
});

/**
 * User data survives an entry moving to Duas (ADR 0091, spec §11). The content database changes; `user.db` (favourites,
 * progress) is never written by a pack install, so these rows must read the same afterwards.
 */
describe('user data survives an entry moving to Duas', () => {
  const MOVED = 'fixture:entry-008';
  const SCOPE = 'category:home-and-family';
  const PERIOD = '2026-11-01';

  let contentDb: DatabaseSync;
  let executor: SqlExecutor;
  let userDb: DatabaseSync;
  let user: SqlExecutor;

  beforeEach(() => {
    const content = openAzkarContentDb();
    contentDb = content.database;
    executor = content.executor;
    loadAzkarDevFixtures(executor);

    const userOpened = openAzkarUserDb();
    userDb = userOpened.database;
    user = userOpened.executor;
  });

  afterEach(() => {
    contentDb.close();
    userDb.close();
  });

  function moveToDuas(entryKey: string): void {
    executor.run(`UPDATE azkar_entries SET home = 'duas' WHERE entry_key = ?`, [entryKey]);
  }

  it('keeps a favourite on a moved entry in the favourites list, and it still opens', () => {
    toggleFavorite(MOVED, { db: user, now: () => 1_000 });
    moveToDuas(MOVED);

    expect(isFavorite(MOVED, { db: user })).toBe(true);
    expect(listFavorites({ db: user }).map((favorite) => favorite.entryKey)).toEqual([MOVED]);

    const [card] = listFavoriteCards(executor, listFavorites({ db: user }));
    expect(card).toMatchObject({ entryKey: MOVED, preview: 'نص تجريبي ١٠ — ليس ذكرًا' });
    expect(getEntry(executor, MOVED)?.entry.home).toBe('duas');
  });

  it('leaves azkar_progress rows for a moved entry untouched', () => {
    recordTap(SCOPE, PERIOD, 'fixture:item-012', 3, { db: user, now: () => 2_000 });
    const before = getProgressRows(SCOPE, PERIOD, { db: user });
    expect(before).toHaveLength(1);
    expect(at(before, 0).currentCount).toBe(1);

    moveToDuas(MOVED);

    expect(getProgressRows(SCOPE, PERIOD, { db: user })).toEqual(before);
  });

  it('keeps a favourite whose entry is missing from the pack, skipped rather than deleted', () => {
    toggleFavorite('fixture:gone', { db: user, now: () => 1_000 });

    expect(listFavoriteCards(executor, listFavorites({ db: user }))).toEqual([]);
    expect(listFavorites({ db: user }).map((favorite) => favorite.entryKey)).toEqual(['fixture:gone']);
  });
});
