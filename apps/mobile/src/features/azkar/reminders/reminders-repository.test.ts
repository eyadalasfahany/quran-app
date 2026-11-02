import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { clearLocalUserData } from '@/core/db/user/clear';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import {
  deleteReminder,
  deleteReminderForTarget,
  getReminder,
  listReminders,
  rowToReminder,
  saveReminder,
  setNotificationIds,
  type AzkarReminderInput,
  type RemindersStore,
} from './reminders-repository';

const CLOCK: AzkarReminderInput = {
  targetType: 'category',
  targetKey: 'morning',
  enabled: true,
  triggerType: 'clock',
  clockTime: '06:30',
  prayer: null,
  offsetMinutes: null,
};

describe('azkar reminders repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;
  let store: RemindersStore;
  let ids: number;

  beforeEach(() => {
    const opened = openAzkarUserDb();
    database = opened.database;
    executor = opened.executor;
    ids = 0;
    store = { db: executor, now: () => 1_000, uuid: () => `reminder-${(ids += 1)}` };
  });

  afterEach(() => {
    database.close();
  });

  it('saves a reminder with no notifications and reads it back', () => {
    const saved = saveReminder(CLOCK, store);

    expect(saved).toEqual({
      id: 'reminder-1',
      targetType: 'category',
      targetKey: 'morning',
      enabled: true,
      triggerType: 'clock',
      clockTime: '06:30',
      prayer: null,
      offsetMinutes: null,
      notificationIds: [],
      updatedAt: 1_000,
    });
    expect(getReminder('category', 'morning', store)).toEqual(saved);
  });

  it('upserts by target: a second save updates the same row and keeps its id', () => {
    saveReminder(CLOCK, store);

    const updated = saveReminder({ ...CLOCK, clockTime: '07:15' }, { ...store, now: () => 2_000 });

    expect(listReminders(store)).toHaveLength(1);
    expect(updated.id).toBe('reminder-1');
    expect(updated.clockTime).toBe('07:15');
    expect(updated.updatedAt).toBe(2_000);
  });

  it('keeps the scheduled notification ids across an edit: the sync cancels them, not the save', () => {
    const saved = saveReminder(CLOCK, store);
    setNotificationIds(saved.id, ['n-1', 'n-2'], store);

    const edited = saveReminder({ ...CLOCK, enabled: false }, store);

    expect(edited.notificationIds).toEqual(['n-1', 'n-2']);
  });

  it('stores the enabled flag as a boolean and the prayer trigger fields', () => {
    saveReminder(
      { targetType: 'entry', targetKey: 'hisn-al-muslim:entry-000075', enabled: false, triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 15 },
      store,
    );

    expect(getReminder('entry', 'hisn-al-muslim:entry-000075', store)).toMatchObject({
      enabled: false,
      triggerType: 'prayer_relative',
      prayer: 'asr',
      offsetMinutes: 15,
    });
  });

  it('lists categories and entries in a stable order', () => {
    saveReminder({ ...CLOCK, targetType: 'entry', targetKey: 'e-1' }, store);
    saveReminder({ ...CLOCK, targetKey: 'evening' }, store);
    saveReminder(CLOCK, store);

    expect(listReminders(store).map((reminder) => `${reminder.targetType}:${reminder.targetKey}`)).toEqual([
      'category:evening',
      'category:morning',
      'entry:e-1',
    ]);
  });

  it('records and clears notification ids', () => {
    const saved = saveReminder(CLOCK, store);

    setNotificationIds(saved.id, ['a', 'b'], store);
    expect(getReminder('category', 'morning', store)?.notificationIds).toEqual(['a', 'b']);

    setNotificationIds(saved.id, [], store);
    expect(getReminder('category', 'morning', store)?.notificationIds).toEqual([]);
  });

  it('deletes a reminder', () => {
    const saved = saveReminder(CLOCK, store);

    deleteReminder(saved.id, store);

    expect(getReminder('category', 'morning', store)).toBeNull();
  });

  it('writes nothing to the outbox: reminders are local only', () => {
    saveReminder(CLOCK, store);

    const outbox = database.prepare('SELECT count(*) AS count FROM outbox').get() as { count: number };
    expect(outbox.count).toBe(0);
  });

  it('is cleared with the other personal data', () => {
    saveReminder(CLOCK, store);

    clearLocalUserData(executor);

    expect(listReminders(store)).toEqual([]);
  });

  it('treats unreadable stored ids as none', () => {
    const row = {
      id: 'r',
      targetType: 'category',
      targetKey: 'morning',
      enabled: 1,
      triggerType: 'clock',
      clockTime: '06:30',
      prayer: null,
      offsetMinutes: null,
      notificationIds: '{oops',
      updatedAt: 1,
    };
    expect(rowToReminder(row).notificationIds).toEqual([]);
    expect(rowToReminder({ ...row, notificationIds: '["ok",3]' }).notificationIds).toEqual(['ok']);
  });

  it('deletes a reminder by target', () => {
    saveReminder({ ...CLOCK, targetType: 'my_dua', targetKey: 'dua-1' }, store);
    deleteReminderForTarget('my_dua', 'dua-1', store);
    expect(getReminder('my_dua', 'dua-1', store)).toBeNull();
  });

  it('refuses an unknown stored trigger', () => {
    expect(() =>
      rowToReminder({
        id: 'r',
        targetType: 'category',
        targetKey: 'morning',
        enabled: 1,
        triggerType: 'weekly',
        clockTime: null,
        prayer: null,
        offsetMinutes: null,
        notificationIds: null,
        updatedAt: 1,
      }),
    ).toThrow('Unknown azkar reminder trigger');
  });
});
