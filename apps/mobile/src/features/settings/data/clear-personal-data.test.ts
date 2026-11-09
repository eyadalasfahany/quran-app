import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { openUserDb } from '@/core/db/user/open';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { requestAndroidWidgetUpdates } from '@/features/widgets/android/update';
import { gatherWidgetSnapshot } from '@/features/widgets/snapshot/gather';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { clearPersonalData } from './clear-personal-data';

jest.mock('@/core/db/user/open', () => ({
  openUserDb: jest.fn(),
}));

jest.mock('@/features/widgets/android/update', () => ({
  requestAndroidWidgetUpdates: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/widgets/snapshot/gather', () => ({
  gatherWidgetSnapshot: jest.fn(),
}));

// The snapshot is only stored and redrawn here; its shape is the builder's concern. Placeholder numbers, not personal data.
const EMPTY_SNAPSHOT = { schemaVersion: 1, writtenAt: 0, locale: 'ar', progress: { percent: 0, rows: [] } };

type Pending = { identifier: string; content: { data?: Record<string, unknown> }; trigger: unknown };

let pending: Pending[] = [];
let sequence = 0;

/** The notifications the app can have pending, one per family, as the schedulers build them. */
const FAMILIES = {
  azkar: { identifier: 'azkar-1', content: { data: { route: '/azkar/category/morning' } } },
  daily: { identifier: 'daily-1', content: { data: { route: '/read/2:255' } } },
  friday: { identifier: 'friday-1', content: { data: { route: '/read/18:1', reminder: 'friday' } } },
  misbaha: { identifier: 'misbaha-1', content: { data: { route: '/sibha', reminder: 'misbaha' } } },
  prayer: { identifier: 'prayer-1', content: { data: { route: '/salah' } } },
} as const;

function fakeScheduler(): void {
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation((request) => {
    sequence += 1;
    const identifier = `scheduled-${sequence}`;
    pending.push({ identifier, content: request.content as Pending['content'], trigger: request.trigger });
    return Promise.resolve(identifier);
  });
  jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation((identifier: string) => {
    pending = pending.filter((request) => request.identifier !== identifier);
    return Promise.resolve();
  });
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockImplementation(() =>
    Promise.resolve(pending.map((request) => ({ ...request })) as never),
  );
}

describe('clearPersonalData', () => {
  let database: ReturnType<typeof openUserTestStore>['database'];
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.clearAll();
    pending = [];
    sequence = 0;
    fakeScheduler();
    const opened = openUserTestStore();
    database = opened.database;
    jest.mocked(openUserDb).mockReturnValue({ executor: opened.store.db } as never);
    jest.mocked(gatherWidgetSnapshot).mockResolvedValue(EMPTY_SNAPSHOT as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    database.close();
  });

  /** Seeds one family: its setting and its pending notification, plus the DB row for Azkar. */
  function seedFamily(family: keyof typeof FAMILIES): void {
    const request = FAMILIES[family];
    pending.push({ ...request, trigger: { type: 'daily' } } as Pending);
    if (family === 'azkar') {
      database.exec(
        `INSERT INTO azkar_reminders (id, target_type, target_key, enabled, trigger_type, clock_time, prayer, offset_minutes, notification_ids, updated_at) VALUES ('r1', 'category', 'morning', 1, 'clock', '07:00', NULL, NULL, '["azkar-1"]', 100);`,
      );
    }
    if (family === 'daily') {
      storage.set(storageKeys.dailyReminder, true);
      storage.set(storageKeys.dailyReminderTime, '08:00');
      storage.set(storageKeys.dailyReminderNotificationId, 'daily-1');
    }
    if (family === 'friday') {
      storage.set(storageKeys.reminders.friday, JSON.stringify({ enabled: true, mode: 'clock', clockTime: '12:00' }));
    }
    if (family === 'misbaha') {
      storage.set(storageKeys.reminders.misbaha, JSON.stringify({ enabled: true, clockTime: '09:00' }));
    }
    if (family === 'prayer') {
      storage.set(storageKeys.salah.bellFajr, true);
    }
  }

  it.each(Object.keys(FAMILIES) as (keyof typeof FAMILIES)[])(
    'cancels the pending %s notification and schedules nothing after the clear',
    async (family) => {
      seedFamily(family);
      expect(pending).toHaveLength(1);

      const result = await clearPersonalData();

      expect(result.failed).toEqual([]);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(FAMILIES[family].identifier);
      expect(pending).toEqual([]);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    },
  );

  it('leaves no pending notification when every family is on', async () => {
    for (const family of Object.keys(FAMILIES) as (keyof typeof FAMILIES)[]) {
      seedFamily(family);
    }
    expect(pending).toHaveLength(5);

    await clearPersonalData();

    expect(pending).toEqual([]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('removes the personal keys and the schedule caches, and keeps the device settings', async () => {
    const personal = [
      storageKeys.dailyReminder,
      storageKeys.dailyReminderTime,
      storageKeys.reminders.friday,
      storageKeys.reminders.misbaha,
      storageKeys.reminders.recommendedShown,
      storageKeys.salah.bellFajr,
      storageKeys.dailyGoals,
      storageKeys.sibha.state,
      storageKeys.azkar.recentScopes,
      storageKeys.azkar.searchRecent,
    ];
    const caches = [
      storageKeys.reminders.goalsSync,
      storageKeys.azkar.remindersSync,
      storageKeys.salah.notificationsSync,
      `${storageKeys.salah.notificationsSync}.settings`,
    ];
    const deviceSettings = [storageKeys.locale, storageKeys.appearance, storageKeys.azkar.fontScale];
    for (const key of [...personal, ...caches, ...deviceSettings]) {
      storage.set(key, 'value');
    }

    await clearPersonalData();

    for (const key of [...personal, ...caches]) {
      expect(storage.contains(key)).toBe(false);
    }
    for (const key of deviceSettings) {
      expect(storage.contains(key)).toBe(true);
    }
  });

  it('removes the saved last automatic place (ADR 0086) with the other personal state', async () => {
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');

    await clearPersonalData();

    expect(storage.contains(storageKeys.salah.lastAutoCoords)).toBe(false);
  });

  it('drops the renew state before the resyncs rebuild it, so no stale schedule end survives the clear', async () => {
    storage.set(storageKeys.notifications.renew, JSON.stringify({ prayer: Date.now() + 86_400_000 * 5, azkar: null }));

    const result = await clearPersonalData();

    expect(result.failed).toEqual([]);
    const renew = JSON.parse(storage.getString(storageKeys.notifications.renew) ?? '{}') as Record<string, unknown>;
    expect(renew.prayer ?? null).toBeNull();
  });

  it('rebuilds the widget snapshot and requests the Android widget update', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    storage.set(storageKeys.widgets.snapshot, JSON.stringify({ schemaVersion: 1, progress: { percent: 80 } }));

    const result = await clearPersonalData();

    expect(result.failed).toEqual([]);
    expect(gatherWidgetSnapshot).toHaveBeenCalledTimes(1);
    expect(storage.getString(storageKeys.widgets.snapshot)).toBe(JSON.stringify(EMPTY_SNAPSHOT));
    expect(requestAndroidWidgetUpdates).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the snapshot on iOS without asking the Android widgets', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    const result = await clearPersonalData();

    expect(result.failed).toEqual([]);
    expect(storage.getString(storageKeys.widgets.snapshot)).toBe(JSON.stringify(EMPTY_SNAPSHOT));
    expect(requestAndroidWidgetUpdates).not.toHaveBeenCalled();
  });

  it('still requests the Android redraw when the snapshot cannot be built, and reports it', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(gatherWidgetSnapshot).mockRejectedValue(new Error('gather failed'));

    const result = await clearPersonalData();

    expect(result.failed).toEqual(['widgets.snapshot']);
    expect(requestAndroidWidgetUpdates).toHaveBeenCalledTimes(1);
    expect(storage.contains(storageKeys.widgets.snapshot)).toBe(false);
  });

  it('keeps going after a failed cancel, reports it, and still rebuilds the widgets', async () => {
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockRejectedValueOnce(new Error('native down'));

    const result = await clearPersonalData();

    expect(result.failed).toEqual(['notifications.cancel']);
    expect(gatherWidgetSnapshot).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('stops before any reminder is rebuilt when the local clear fails', async () => {
    seedFamily('daily');
    jest.mocked(openUserDb).mockImplementation(() => {
      throw new Error('user.db unavailable');
    });

    const result = await clearPersonalData();

    expect(result.failed).toEqual(['local.data']);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(gatherWidgetSnapshot).not.toHaveBeenCalled();
    expect(storage.contains(storageKeys.dailyReminder)).toBe(true);
  });
});
