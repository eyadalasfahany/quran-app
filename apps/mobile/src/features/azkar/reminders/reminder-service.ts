import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { ensureNotificationChannel, NOTIFICATION_CHANNELS } from '@/features/notifications/channels';
import { updateRenewReminder } from '@/features/notifications/renew';

import { duasHref } from '@/features/duas/routes';

import { azkarHref } from '../routes';
import { planAzkarBudget } from './budget-plan';
import { type AzkarReminder, listReminders, type RemindersStore, setNotificationIds } from './reminders-repository';
import { type ClockTrigger, clockTrigger, type Coordinates, prayerRelativeFireDates } from './schedule';
import { currentSyncState, writeRemindersSyncState } from './resync-state';

/**
 * The notification body and title of an Azkar reminder. The body is neutral: the reminder never names a religious time.
 * The sound is the system default (ADR 0047 §6): Azkar reminders do not follow the prayer sound.
 */
export function reminderContent(reminder: AzkarReminder): {
  title: string;
  body: string;
  data: { route: string };
  sound: 'default';
} {
  const body = i18n.t('azkar.reminders.notificationBody');
  if (reminder.targetType === 'category') {
    return {
      title: i18n.t('azkar.reminders.notificationTitle', {
        name: i18n.t(`azkar.categories.${reminder.targetKey}` as never),
      }),
      body,
      data: { route: String(azkarHref.category(reminder.targetKey)) },
      sound: 'default',
    };
  }
  if (reminder.targetType === 'my_dua') {
    // Fixed text only: a notification never shows the user's own dua (it can sit on a lock screen).
    return {
      title: i18n.t('duas.reminders.notificationTitle'),
      body: i18n.t('duas.reminders.notificationBody'),
      data: { route: String(duasHref.mineDetail(reminder.targetKey)) },
      sound: 'default',
    };
  }
  return {
    title: i18n.t('azkar.reminders.notificationEntryTitle'),
    body,
    data: { route: String(azkarHref.entry(reminder.targetKey)) },
    sound: 'default',
  };
}

// Android delivers through the azkar channel; iOS has no channels and ignores the field.
function clockTriggerInput(trigger: ClockTrigger): Notifications.NotificationTriggerInput {
  const { hour, minute } = trigger;
  return Platform.OS === 'android'
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: NOTIFICATION_CHANNELS.azkar }
    : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true };
}

function dateTriggerInput(date: Date): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android'
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: NOTIFICATION_CHANNELS.azkar }
    : { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
}

/**
 * Schedules one reminder and records each id in `ids` as it goes, so a failure part-way leaves the ids that were made
 * for the next sync to cancel. A prayer-relative reminder also pushes each fire date into `dates` (ADR 0083).
 */
async function scheduleInto(
  ids: string[],
  dates: Date[],
  reminder: AzkarReminder,
  now: Date,
  coords: Coordinates | null,
  window: number,
): Promise<void> {
  if (!reminder.enabled) {
    return;
  }
  const content = reminderContent(reminder);

  if (reminder.triggerType === 'clock') {
    const trigger = clockTrigger(reminder.clockTime);
    if (trigger === null) {
      return;
    }
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger: clockTriggerInput(trigger) }));
    return;
  }

  for (const date of prayerRelativeFireDates(reminder, now, coords, window)) {
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger: dateTriggerInput(date) }));
    dates.push(date);
  }
}

/**
 * Rebuilds every Azkar reminder's notifications (ADR 0031 §7). For each row it cancels the ids stored by the previous
 * sync first, so running it twice never doubles a notification. Disabled rows end with no ids. Prayer-relative rows
 * need coordinates: without them they schedule nothing and the result says `needsLocation`.
 *
 * The pending pool is limited (`AZKAR_SLOTS`): `planAzkarBudget` decides each reminder's window, shrinking prayer
 * windows first and leaving the newest unscheduled. Those ids come back as `unscheduled`.
 */
export async function syncAzkarReminders({
  now,
  coords,
  store,
}: {
  now: Date;
  coords: Coordinates | null;
  store?: RemindersStore;
}): Promise<{ needsLocation: boolean; unscheduled: string[] }> {
  await ensureNotificationChannel(NOTIFICATION_CHANNELS.azkar);

  const reminders = listReminders(store);
  const plan = planAzkarBudget(reminders);
  const unscheduled: string[] = [];
  // Each prayer-relative reminder's last fire: the first of them to run out ends the Azkar schedule (ADR 0083).
  let earliestExpiry: Date | null = null;
  let needsLocation = false;
  for (const reminder of reminders) {
    for (const id of reminder.notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }

    const ids: string[] = [];
    const dates: Date[] = [];
    const window = plan.windows.get(reminder.id);
    try {
      if (window !== undefined) {
        await scheduleInto(ids, dates, reminder, now, coords, window);
      }
    } finally {
      setNotificationIds(reminder.id, ids, store);
    }

    if (plan.unscheduled.includes(reminder.id)) {
      unscheduled.push(reminder.id);
    }
    if (reminder.enabled && reminder.triggerType === 'prayer_relative' && coords === null) {
      needsLocation = true;
    }
    const lastDate = dates.reduce<Date | null>((latest, date) => (latest === null || date > latest ? date : latest), null);
    if (lastDate !== null && (earliestExpiry === null || lastDate < earliestExpiry)) {
      earliestExpiry = lastDate;
    }
  }

  writeRemindersSyncState(currentSyncState(now, coords));
  await updateRenewReminder('azkar', earliestExpiry, now);
  return { needsLocation, unscheduled };
}
