import * as Notifications from 'expo-notifications';
import type { DatabaseSync } from 'node:sqlite';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { AZKAR_ROLLING_DAYS, AZKAR_SLOTS } from '@/features/notifications/budget';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { reminderContent, syncAzkarReminders } from './reminder-service';
import {
  getReminder,
  saveReminder,
  type AzkarReminderInput,
  type RemindersStore,
} from './reminders-repository';
import type { Coordinates } from './schedule';

const LONDON: Coordinates = { lat: 51.5074, lng: -0.1278 };
const NOW = new Date(2026, 9, 31, 12, 0, 0, 0);

const CATEGORY_MORNING: AzkarReminderInput = {
  targetType: 'category',
  targetKey: 'morning',
  enabled: true,
  triggerType: 'clock',
  clockTime: '06:30',
  prayer: null,
  offsetMinutes: null,
};

const PRAYER_ENTRY: AzkarReminderInput = {
  targetType: 'entry',
  targetKey: 'hisn-al-muslim:entry-000075',
  enabled: true,
  triggerType: 'prayer_relative',
  clockTime: null,
  prayer: 'asr',
  offsetMinutes: 10,
};

type Scheduled = {
  id: string;
  content: { title: string; body: string; data: { route: string }; sound: string | false };
  trigger: Record<string, unknown>;
};

/**
 * A fake of the native scheduler: schedule adds an id, cancel removes it. `live` is what the device would still deliver,
 * which is what the duplicate checks measure.
 */
function fakeScheduler() {
  const live = new Map<string, Scheduled>();
  let counter = 0;
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation((request) => {
    counter += 1;
    const id = `n-${counter}`;
    live.set(id, request as unknown as Scheduled);
    return Promise.resolve(id);
  });
  jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation((id) => {
    live.delete(id);
    return Promise.resolve();
  });
  return live;
}

function scheduledCalls(): Scheduled[] {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request as unknown as Scheduled);
}

describe('syncAzkarReminders', () => {
  let database: DatabaseSync;
  let store: RemindersStore;
  let live: Map<string, Scheduled>;

  beforeEach(async () => {
    const opened = openAzkarUserDb();
    database = opened.database;
    let ids = 0;
    store = { db: opened.executor, now: () => 1_000, uuid: () => `reminder-${(ids += 1)}` };
    storage.clearAll();
    jest.clearAllMocks();
    live = fakeScheduler();
    await i18n.changeLanguage('ar');
  });

  afterEach(() => {
    database.close();
  });

  it('schedules a clock reminder as one repeating trigger on iOS', async () => {
    saveReminder(CATEGORY_MORNING, store);

    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(scheduledCalls()).toEqual([
      {
        content: {
          title: 'أذكار الصباح',
          body: 'تذكيرك الذي اخترته',
          data: { route: '/azkar/category/morning' },
          sound: 'default',
        },
        trigger: { type: 'calendar', hour: 6, minute: 30, repeats: true },
      },
    ]);
  });

  it('schedules a clock reminder as a daily trigger on the azkar channel on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      saveReminder(CATEGORY_MORNING, store);

      await syncAzkarReminders({ now: NOW, coords: LONDON, store });

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('azkar', expect.objectContaining({}));
      expect(scheduledCalls()[0]?.trigger).toMatchObject({ type: 'daily', hour: 6, minute: 30, channelId: 'azkar' });
    } finally {
      restore.restore();
    }
  });

  it('schedules one DATE trigger per prayer-relative fire date, inside the rolling window', async () => {
    saveReminder(PRAYER_ENTRY, store);

    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    const calls = scheduledCalls();
    expect(calls).toHaveLength(AZKAR_ROLLING_DAYS);
    for (const call of calls) {
      expect(call.trigger).toMatchObject({ type: 'date' });
      expect(call.content.data.route).toBe('/azkar/entry/hisn-al-muslim%3Aentry-000075');
    }
  });

  it('persists the ids it scheduled on the reminder', async () => {
    saveReminder(PRAYER_ENTRY, store);

    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    const saved = getReminder('entry', 'hisn-al-muslim:entry-000075', store);
    expect(saved?.notificationIds).toEqual([...live.keys()]);
    expect(saved?.notificationIds).toHaveLength(AZKAR_ROLLING_DAYS);
  });

  it('cancels the stored ids before scheduling, so two syncs leave no duplicates', async () => {
    saveReminder(CATEGORY_MORNING, store);
    saveReminder(PRAYER_ENTRY, store);

    await syncAzkarReminders({ now: NOW, coords: LONDON, store });
    const afterFirst = live.size;
    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(live.size).toBe(afterFirst);
    expect(afterFirst).toBe(1 + AZKAR_ROLLING_DAYS);
    // The first sync's ids were all cancelled before the second sync scheduled its own.
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1 + AZKAR_ROLLING_DAYS);
  });

  it('cancels a disabled reminder and leaves it with no ids', async () => {
    const saved = saveReminder(CATEGORY_MORNING, store);
    await syncAzkarReminders({ now: NOW, coords: LONDON, store });
    expect(live.size).toBe(1);

    saveReminder({ ...CATEGORY_MORNING, enabled: false }, store);
    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(live.size).toBe(0);
    expect(getReminder('category', 'morning', store)?.notificationIds).toEqual([]);
    expect(saved.id).toBe('reminder-1');
  });

  it('schedules nothing for a prayer-relative reminder without coordinates, and reports that a location is needed', async () => {
    saveReminder(PRAYER_ENTRY, store);

    const result = await syncAzkarReminders({ now: NOW, coords: null, store });

    expect(result).toEqual({ needsLocation: true, unscheduled: [] });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not report a needed location for clock reminders', async () => {
    saveReminder(CATEGORY_MORNING, store);

    const result = await syncAzkarReminders({ now: NOW, coords: null, store });

    expect(result).toEqual({ needsLocation: false, unscheduled: [] });
    expect(live.size).toBe(1);
  });

  it('schedules nothing for a clock reminder whose time is not chosen yet', async () => {
    saveReminder({ ...CATEGORY_MORNING, clockTime: null }, store);

    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('keeps the ids of a part-way failure, so the next sync can cancel them', async () => {
    saveReminder(PRAYER_ENTRY, store);
    let calls = 0;
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(() => {
      calls += 1;
      if (calls === 2) {
        return Promise.reject(new Error('pending limit'));
      }
      return Promise.resolve(`partial-${calls}`);
    });

    await expect(syncAzkarReminders({ now: NOW, coords: LONDON, store })).rejects.toThrow('pending limit');

    expect(getReminder('entry', 'hisn-al-muslim:entry-000075', store)?.notificationIds).toEqual(['partial-1']);
  });

  it('records the day, the time zone and the coordinates it synced for', async () => {
    await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(JSON.parse(storage.getString(storageKeys.azkar.remindersSync) ?? '{}')).toEqual({
      day: '2026-10-31',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      coordsKey: '51.51,-0.13',
    });
  });
});

describe('syncAzkarReminders within the pending pool', () => {
  let database: DatabaseSync;
  let store: RemindersStore;
  let live: Map<string, Scheduled>;
  let tick: number;

  beforeEach(async () => {
    const opened = openAzkarUserDb();
    database = opened.database;
    tick = 0;
    let ids = 0;
    // Each save gets a later update time, so the planning order follows the save order.
    store = { db: opened.executor, now: () => (tick += 1), uuid: () => `reminder-${(ids += 1)}` };
    storage.clearAll();
    jest.clearAllMocks();
    live = fakeScheduler();
    await i18n.changeLanguage('ar');
  });

  afterEach(() => {
    database.close();
  });

  function savePrayerEntries(count: number) {
    for (let index = 1; index <= count; index += 1) {
      saveReminder(
        { targetType: 'entry', targetKey: `e-${index}`, enabled: true, triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 0 },
        store,
      );
    }
  }

  it('shrinks the windows so six prayer-relative reminders stay within the 21 pending slots', async () => {
    savePrayerEntries(6);

    const result = await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(live.size).toBe(AZKAR_SLOTS);
    expect(result).toEqual({ needsLocation: false, unscheduled: [] });
    // The newest entry gets the shortest window.
    expect(getReminder('entry', 'e-6', store)?.notificationIds).toHaveLength(AZKAR_SLOTS - 5 * AZKAR_ROLLING_DAYS);
  });

  it('leaves the newest reminder unscheduled, and reports it, when the pool is full', async () => {
    savePrayerEntries(24);

    const result = await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(live.size).toBe(AZKAR_SLOTS);
    expect(result.unscheduled).toEqual(['reminder-22', 'reminder-23', 'reminder-24']);
    expect(getReminder('entry', 'e-24', store)?.notificationIds).toEqual([]);
  });

  it('cancels the old ids of a reminder that a later sync leaves unscheduled', async () => {
    savePrayerEntries(21);
    await syncAzkarReminders({ now: NOW, coords: LONDON, store });
    expect(live.size).toBe(AZKAR_SLOTS);

    // A 22nd reminder arrives: the pool is full, so it is the one left out and nothing else changes.
    saveReminder(
      { targetType: 'entry', targetKey: 'e-22', enabled: true, triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 0 },
      store,
    );
    const result = await syncAzkarReminders({ now: NOW, coords: LONDON, store });

    expect(live.size).toBe(AZKAR_SLOTS);
    expect(result.unscheduled).toEqual(['reminder-22']);
  });
});

describe('reminderContent', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    jest.restoreAllMocks();
  });

  it('names the category in the title and keeps the body neutral', () => {
    const content = reminderContent({
      id: 'r',
      targetType: 'category',
      targetKey: 'evening',
      enabled: true,
      triggerType: 'clock',
      clockTime: '18:00',
      prayer: null,
      offsetMinutes: null,
      notificationIds: [],
      updatedAt: 1,
    });

    expect(content).toEqual({
      title: 'أذكار المساء',
      body: 'تذكيرك الذي اخترته',
      data: { route: '/azkar/category/evening' },
      sound: 'default',
    });
  });

  it('uses the entry route for an entry reminder', () => {
    const content = reminderContent({
      id: 'r',
      targetType: 'entry',
      targetKey: 'fixture:entry-001',
      enabled: true,
      triggerType: 'clock',
      clockTime: '08:00',
      prayer: null,
      offsetMinutes: null,
      notificationIds: [],
      updatedAt: 1,
    });

    expect(content.data.route).toBe('/azkar/entry/fixture%3Aentry-001');
    expect(content.title).toBe('تذكير الأذكار');
    expect(content.sound).toBe('default');
  });

  it('routes a my_dua reminder to its reading view with fixed text that names no dua', () => {
    const content = reminderContent({
      id: 'r',
      targetType: 'my_dua',
      targetKey: 'dua-1',
      enabled: true,
      triggerType: 'clock',
      clockTime: '08:00',
      prayer: null,
      offsetMinutes: null,
      notificationIds: [],
      updatedAt: 1,
    });

    expect(content.data.route).toBe('/duas/mine/dua-1');
    expect(content.title).toBe('تذكير من أدعيتك');
    expect(content.body).toBe('افتح لتقرأ دعاءك');
    expect(`${content.title} ${content.body}`).not.toContain('FIXTURE');
  });
});
