import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { ensureNotificationChannel, NOTIFICATION_CHANNELS } from '@/features/notifications/channels';
import type { SyncCoordinates } from '@/features/notifications/sync-state';

import { FRIDAY_WEEKDAY, KAHF_ROUTE, fridayClock } from './friday';
import { type FridayReminder, type MisbahaReminder } from './goal-settings';

/** The route the misbaha reminder opens: the misbaha screen (ADR 0034 §4). */
export const MISBAHA_ROUTE = '/sibha';

/** What a goal reminder's notification is tagged with, so a re-plan finds and cancels its own pending requests. */
export type GoalKind = 'friday' | 'misbaha';

/**
 * `off`: nothing scheduled. `scheduled`: one repeating notification is pending. `needsLocation`: Dhuhr mode without a
 * location. `needsTime`: a clock mode with no time chosen.
 */
export type GoalScheduleResult = 'off' | 'scheduled' | 'needsLocation' | 'needsTime';

/**
 * Cancels the pending notifications of one goal kind. The pending list is the source of truth, so an orphan from an
 * earlier plan is cancelled too and a re-plan never doubles a reminder.
 */
export async function cancelGoalNotifications(kind: GoalKind): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of pending) {
    if (request.content.data?.reminder === kind) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

/**
 * Schedules the Friday reminder as one weekly repeating notification. Android uses the goals channel; iOS has no channels
 * and ignores the field. Each call first cancels the previous Friday notification.
 */
export async function scheduleFridayReminder(
  settings: FridayReminder,
  now: Date,
  coords: SyncCoordinates | null,
): Promise<GoalScheduleResult> {
  await cancelGoalNotifications('friday');
  if (!settings.enabled) {
    return 'off';
  }
  const clock = fridayClock(settings, now, coords);
  if (clock === null) {
    return settings.mode === 'dhuhr' ? 'needsLocation' : 'needsTime';
  }
  await ensureNotificationChannel(NOTIFICATION_CHANNELS.goals);
  const { hour, minute } = clock;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('reminders.friday.notificationTitle'),
      body: i18n.t('reminders.friday.notificationBody'),
      data: { route: KAHF_ROUTE, reminder: 'friday' },
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: FRIDAY_WEEKDAY,
            hour,
            minute,
            channelId: NOTIFICATION_CHANNELS.goals,
          }
        : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: FRIDAY_WEEKDAY, hour, minute },
  });
  return 'scheduled';
}

/**
 * Schedules the misbaha target reminder as one daily repeating notification at the chosen time. Without a time, nothing is
 * scheduled.
 */
export async function scheduleMisbahaReminder(settings: MisbahaReminder): Promise<GoalScheduleResult> {
  await cancelGoalNotifications('misbaha');
  if (!settings.enabled) {
    return 'off';
  }
  if (settings.clockTime === null) {
    return 'needsTime';
  }
  const [hour, minute] = settings.clockTime.split(':').map(Number) as [number, number];
  await ensureNotificationChannel(NOTIFICATION_CHANNELS.goals);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('reminders.misbaha.notificationTitle'),
      body: i18n.t('reminders.misbaha.notificationBody'),
      data: { route: MISBAHA_ROUTE, reminder: 'misbaha' },
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: NOTIFICATION_CHANNELS.goals,
          }
        : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true },
  });
  return 'scheduled';
}
