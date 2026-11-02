import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { getReminder, saveReminder } from '@/features/azkar/reminders/reminders-repository';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import {
  createMyDua,
  deleteMyDua,
  getMyDua,
  listMyDuas,
  updateMyDua,
  type MyDuasStore,
} from './my-duas-repository';

const FIXTURE_BODY = '  FIXTURE text 1 — not a dua\u200f  ';
const FIXTURE_TITLE = 'FIXTURE title 1 — not a dua';

describe('my-duas-repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;
  let store: MyDuasStore;
  let ids: number;

  beforeEach(() => {
    const opened = openAzkarUserDb();
    database = opened.database;
    executor = opened.executor;
    ids = 0;
    store = { db: executor, now: () => 1_000 + ids, uuid: () => `dua-${(ids += 1)}` };
  });

  afterEach(() => {
    database.close();
  });

  it('stores body byte for byte and derives text_search', () => {
    const saved = createMyDua({ title: null, body: FIXTURE_BODY }, store);

    expect(saved.body).toBe(FIXTURE_BODY);
    expect(saved.textSearch.length).toBeGreaterThan(0);
    expect(getMyDua(saved.id, store)?.body).toBe(FIXTURE_BODY);
  });

  it('creates, updates, lists and deletes', () => {
    const first = createMyDua({ title: FIXTURE_TITLE, body: FIXTURE_BODY }, store);
    const second = createMyDua({ title: null, body: 'FIXTURE text 2 — not a dua' }, { ...store, now: () => 2_000 });

    expect(listMyDuas(store).map((row) => row.id)).toEqual([second.id, first.id]);

    updateMyDua(first.id, { title: 'FIXTURE title 2 — not a dua', body: FIXTURE_BODY }, { ...store, now: () => 3_000 });
    expect(getMyDua(first.id, store)?.title).toBe('FIXTURE title 2 — not a dua');

    deleteMyDua(second.id, store);
    expect(listMyDuas(store)).toHaveLength(1);
  });

  it('deletes the my_dua reminder when the dua is deleted', () => {
    const dua = createMyDua({ title: null, body: FIXTURE_BODY }, store);
    saveReminder(
      {
        targetType: 'my_dua',
        targetKey: dua.id,
        enabled: true,
        triggerType: 'clock',
        clockTime: '08:00',
        prayer: null,
        offsetMinutes: null,
      },
      { db: executor, now: () => 5_000, uuid: () => 'rem-1' },
    );

    deleteMyDua(dua.id, store);

    expect(getReminder('my_dua', dua.id, { db: executor })).toBeNull();
  });
});
