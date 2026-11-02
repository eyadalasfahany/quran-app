import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { ensureNotificationChannel, NOTIFICATION_CHANNELS } from '@/features/notifications/channels';
import { ensureReminderPermission } from '@/features/notifications/permission';

/** The test notification fires this many seconds after the tap (the hub's «إرسال تذكير تجريبي»). */
export const TEST_REMINDER_DELAY_SECONDS = 5;

/** The route a tap on the test notification opens: the reminders hub itself. */
export const REMINDERS_ROUTE = '/reminders';

/**
 * Schedules one notification that fires in `TEST_REMINDER_DELAY_SECONDS`, through the same channel and trigger path as the
 * real reminders, so the test shows whether delivery works. Resolves to false when the system has notifications off.
 * `delaySeconds` is for the development-only check, which schedules a reminder two minutes out to test a background fire.
 */
export async function sendTestReminder(delaySeconds: number = TEST_REMINDER_DELAY_SECONDS): Promise<boolean> {
  const granted = await ensureReminderPermission();
  if (!granted) {
    return false;
  }
  await ensureNotificationChannel(NOTIFICATION_CHANNELS.goals);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('reminders.test.title'),
      body: i18n.t('reminders.test.body'),
      data: { route: REMINDERS_ROUTE, reminder: 'test' },
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySeconds,
            repeats: false,
            channelId: NOTIFICATION_CHANNELS.goals,
          }
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, repeats: false },
  });
  return true;
}
