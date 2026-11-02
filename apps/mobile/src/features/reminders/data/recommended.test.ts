import { storage, storageKeys } from '@/core/storage/mmkv';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import { listReminders, saveReminder } from '@/features/azkar/reminders/reminders-repository';
import { ensureReminderPermission } from '@/features/notifications/permission';
import { BELL_PRAYERS, getBellEnabled } from '@/features/salah/data/bells';
import { resyncPrayerNotifications } from '@/features/salah/data/notifications';

import { readFridayReminder, readMisbahaReminder } from './goal-settings';
import { resyncGoalReminders } from './goal-sync';
import { applyRecommendedSet, isRecommendedSetDue, isAnyReminderOn, markRecommendedSetShown, RECOMMENDED_AZKAR } from './recommended';

jest.mock('@/features/azkar/reminders/resync', () => ({ resyncAzkarReminders: jest.fn(() => Promise.resolve(null)) }));
jest.mock('@/features/azkar/reminders/reminders-repository', () => ({
  listReminders: jest.fn(() => []),
  saveReminder: jest.fn(),
}));
jest.mock('@/features/notifications/permission', () => ({ ensureReminderPermission: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/features/salah/data/notifications', () => ({ resyncPrayerNotifications: jest.fn(() => Promise.resolve()) }));
jest.mock('./goal-sync', () => ({ resyncGoalReminders: jest.fn(() => Promise.resolve(null)) }));

const NOW = new Date(2026, 2, 26, 9);

describe('recommended set', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(ensureReminderPermission).mockResolvedValue(true);
    jest.mocked(listReminders).mockReturnValue([]);
  });

  it('turns on exactly the four items: the five prayer bells, morning and evening Azkar, and the Friday reminder', async () => {
    const applied = await applyRecommendedSet({ now: NOW, hasAzkar: true });

    expect(applied).toBe(true);
    expect(BELL_PRAYERS.every((prayer) => getBellEnabled(prayer))).toBe(true);
    expect(saveReminder).toHaveBeenCalledTimes(2);
    expect(jest.mocked(saveReminder).mock.calls.map(([input]) => input.targetKey)).toEqual(['morning', 'evening']);
    expect(readFridayReminder()).toEqual({ enabled: true, mode: 'dhuhr', clockTime: null });
  });

  it('gives each Azkar item a prayer-relative trigger at offset 0, with no clock time', async () => {
    await applyRecommendedSet({ now: NOW, hasAzkar: true });

    for (const [input] of jest.mocked(saveReminder).mock.calls) {
      expect(input).toMatchObject({ enabled: true, triggerType: 'prayer_relative', clockTime: null, offsetMinutes: 0 });
    }
    expect(RECOMMENDED_AZKAR).toEqual([
      { targetKey: 'morning', prayer: 'fajr' },
      { targetKey: 'evening', prayer: 'asr' },
    ]);
  });

  it('turns on nothing else: the daily reading reminder, misbaha and other sessions stay off', async () => {
    await applyRecommendedSet({ now: NOW, hasAzkar: true });

    expect(storage.getBoolean(storageKeys.dailyReminder)).toBeUndefined();
    expect(readMisbahaReminder().enabled).toBe(false);
    expect(jest.mocked(saveReminder).mock.calls.every(([input]) => ['morning', 'evening'].includes(input.targetKey))).toBe(true);
  });

  it('skips the Azkar items when there is no Azkar content, and keeps the other three', async () => {
    await applyRecommendedSet({ now: NOW, hasAzkar: false });

    expect(saveReminder).not.toHaveBeenCalled();
    expect(BELL_PRAYERS.every((prayer) => getBellEnabled(prayer))).toBe(true);
    expect(readFridayReminder().enabled).toBe(true);
    expect(resyncAzkarReminders).not.toHaveBeenCalled();
  });

  it('writes nothing and resyncs nothing when notifications are refused', async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValueOnce(false);

    const applied = await applyRecommendedSet({ now: NOW, hasAzkar: true });

    expect(applied).toBe(false);
    expect(BELL_PRAYERS.some((prayer) => getBellEnabled(prayer))).toBe(false);
    expect(readFridayReminder().enabled).toBe(false);
    expect(resyncPrayerNotifications).not.toHaveBeenCalled();
    expect(resyncGoalReminders).not.toHaveBeenCalled();
    expect(isRecommendedSetDue()).toBe(true);
  });

  it('re-plans the prayer, Azkar and goal reminders once each after the tap', async () => {
    await applyRecommendedSet({ now: NOW, hasAzkar: true });

    expect(resyncPrayerNotifications).toHaveBeenCalledWith(NOW);
    expect(resyncAzkarReminders).toHaveBeenCalledWith(NOW);
    expect(resyncGoalReminders).toHaveBeenCalledWith(NOW);
  });
});

describe('recommended set offer', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(listReminders).mockReturnValue([]);
  });

  it('is due once, on a fresh install with nothing on', () => {
    expect(isRecommendedSetDue()).toBe(true);

    markRecommendedSetShown();

    expect(isRecommendedSetDue()).toBe(false);
  });

  it('is not due when any reminder is already on', () => {
    storage.set(storageKeys.reminders.misbaha, JSON.stringify({ enabled: true, clockTime: '21:00' }));

    expect(isAnyReminderOn()).toBe(true);
    expect(isRecommendedSetDue()).toBe(false);
  });

  it('counts a daily reading reminder as on', () => {
    storage.set(storageKeys.dailyReminder, true);

    expect(isRecommendedSetDue()).toBe(false);
  });
});
