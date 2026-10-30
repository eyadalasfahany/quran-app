import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, getLocale, i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { getActivePlan, listLogsForPlan, planProgress, toLocalDateString } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { resolveInitialAnchor } from '@/features/reader/anchor/reading-anchor';

const ANDROID_CHANNEL_ID = 'reminders';
const DEFAULT_TIME = '21:00';

/** Permission is asked only when the user turns the reminder on (spec §13). */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function readReminderTime(): { hour: number; minute: number } {
  const raw = storage.getString(storageKeys.dailyReminderTime) ?? DEFAULT_TIME;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (match === null) {
    return { hour: 21, minute: 0 };
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : { hour: 21, minute: 0 };
}

/** «وِردك اليوم: ٤ صفحات» with an active plan, the generic line without one (content plan §notifications). */
function reminderBody(): string {
  try {
    const plan = getActivePlan();
    if (plan !== null) {
      const bounds = resolvePlanBounds(openContentDb().executor, plan.startVerseId);
      if (bounds !== null) {
        const progress = planProgress(plan, listLogsForPlan(plan.id), toLocalDateString(new Date()), bounds.pagesTotal);
        const locale = getLocale();
        return `${i18n.t('notifications.reminder.wirdToday')} ${i18n.t('khatma.pagesPerDay', {
          count: progress.todayTarget,
          formatted: formatNumber(progress.todayTarget, locale),
        })}`;
      }
    }
  } catch {
    // The databases are not open yet: the generic body always works.
  }
  return i18n.t('notifications.reminder.body');
}

function reminderRoute(): string {
  return `/read/${resolveInitialAnchor().verseKey}`;
}

/**
 * Cancels the scheduled reminder and, when the preference is on, schedules it again at the stored
 * time with a fresh body. Called on bootstrap (timezone and plan changes), on toggle, on time
 * change, and after a khatma plan is saved (spec §13).
 */
export async function syncDailyReminder(): Promise<void> {
  const existingId = storage.getString(storageKeys.dailyReminderNotificationId);
  if (existingId !== undefined) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
    storage.remove(storageKeys.dailyReminderNotificationId);
  }

  if (storage.getBoolean(storageKeys.dailyReminder) !== true) {
    return;
  }

  const { hour, minute } = readReminderTime();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Daily reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.reminder.title'),
      body: reminderBody(),
      data: { route: reminderRoute() },
    },
    trigger:
      Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: ANDROID_CHANNEL_ID }
        : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true },
  });
  storage.set(storageKeys.dailyReminderNotificationId, identifier);
}
