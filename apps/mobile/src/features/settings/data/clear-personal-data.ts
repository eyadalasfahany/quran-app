import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { clearLocalUserData, SCHEDULE_CACHE_KEYS } from '@/core/db/user/clear';
import { storage } from '@/core/storage/mmkv';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import { syncDailyReminder } from '@/features/notifications/reminder-service';
import { resyncGoalReminders } from '@/features/reminders/data/goal-sync';
import { resyncPrayerNotifications } from '@/features/salah/data/notifications';
import { requestAndroidWidgetUpdates } from '@/features/widgets/android/update';
import { gatherWidgetSnapshot } from '@/features/widgets/snapshot/gather';
import { publishWidgetSnapshot } from '@/features/widgets/snapshot/publish';
import { activeWidgetWriters } from '@/features/widgets/writers';

/**
 * «مسح البيانات» for everything the device holds about the user (ADR 0027, ADR 0035 §1.9).
 *
 * Order matters:
 * 1. The local data is cleared first (user.db and the personal MMKV keys). If that fails, nothing else runs, so no
 *    reminder is rebuilt from data that is still there.
 * 2. Every pending notification is cancelled. The stored notification ids were in the rows just deleted, so the cancel
 *    goes by the pending list, which is the source of truth. The app schedules only its own reminders.
 * 3. Each reminder family is resynced from the now-empty state, which schedules nothing. Each resync is best effort: a
 *    failure is logged and the next step still runs.
 * 4. The schedule caches the resyncs wrote are removed again.
 * 5. The widget snapshot is rebuilt from the empty state and the Android widgets are asked to redraw.
 *
 * It never rejects: the caller shows no error UI, and every failed step is logged and listed in the result.
 */

export type ClearStep =
  | 'local.data'
  | 'notifications.cancel'
  | 'reminders.azkar'
  | 'reminders.goals'
  | 'reminders.daily'
  | 'reminders.prayer'
  | 'widgets.snapshot';

export type ClearPersonalDataResult = { failed: ClearStep[] };

async function cancelPendingNotifications(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of pending) {
    await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
}

async function rebuildWidgets(): Promise<void> {
  const android = Platform.OS === 'android';
  try {
    const snapshot = await gatherWidgetSnapshot(new Date());
    await publishWidgetSnapshot(snapshot, activeWidgetWriters(android ? 'android' : 'ios'));
  } catch (error) {
    // The stored snapshot is already gone, so a redraw shows the open-the-app state.
    if (android) {
      await requestAndroidWidgetUpdates();
    }
    throw error;
  }
}

export async function clearPersonalData(): Promise<ClearPersonalDataResult> {
  try {
    clearLocalUserData();
  } catch (error) {
    console.error('clear-data: local data', error);
    return { failed: ['local.data'] };
  }

  const failed: ClearStep[] = [];
  const step = async (name: ClearStep, task: () => Promise<unknown>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      failed.push(name);
      console.error(`clear-data: ${name}`, error);
    }
  };

  await step('notifications.cancel', cancelPendingNotifications);
  await step('reminders.azkar', () => resyncAzkarReminders());
  await step('reminders.goals', () => resyncGoalReminders());
  await step('reminders.daily', () => syncDailyReminder());
  await step('reminders.prayer', () => resyncPrayerNotifications());

  for (const key of SCHEDULE_CACHE_KEYS) {
    storage.remove(key);
  }

  await step('widgets.snapshot', rebuildWidgets);
  return { failed };
}
