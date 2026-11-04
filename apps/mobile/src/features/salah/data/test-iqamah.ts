import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ensureNotificationChannel,
  ensurePrayerChannel,
  NOTIFICATION_CHANNELS,
  prayerChannelId,
} from '@/features/notifications/channels';
import { ensureReminderPermission } from '@/features/notifications/permission';

import { getPrayerSound } from './adhan-sounds';
import { getIqamahOffsetMinutes } from './iqamah-offset';
import {
  enabledPrayers,
  iqamahNotificationContent,
  prayerNotificationContent,
} from './notifications';
import type { NextPrayerName } from './prayer-times';

/** The test adhan (and unpaired iqamah) fires this many seconds after the tap. */
export const TEST_IQAMAH_DELAY_SECONDS = 5;

function intervalTrigger(seconds: number, androidChannelId: string): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android'
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: androidChannelId,
      }
    : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false };
}

/** First enabled prayer bell, else `asr`, so test copy always matches a real prayer name. */
export function testIqamahPrayer(): NextPrayerName {
  const prayers = enabledPrayers();
  return prayers.length > 0 ? prayers[0]! : 'asr';
}

/**
 * Schedules a production-shaped preview. When iqamah offset is on: **adhan first** at `delaySeconds`, then **iqamah**
 * at `delaySeconds + offsetMinutes` seconds (seconds stand in for minutes in QA). When offset is off: iqamah-only at
 * `delaySeconds`. Resolves to `{ sent: false }` when notifications are off.
 */
export async function sendTestIqamahNotification(options?: {
  prayer?: NextPrayerName;
  delaySeconds?: number;
  /** Default true when `getIqamahOffsetMinutes()` > 0. */
  includeAdhanPair?: boolean;
}): Promise<
  { sent: false } | { sent: true; prayer: NextPrayerName; offsetMinutes: number; paired: boolean; delaySeconds: number }
> {
  const granted = await ensureReminderPermission();
  if (!granted) {
    return { sent: false };
  }

  const prayer = options?.prayer ?? testIqamahPrayer();
  const delaySeconds = options?.delaySeconds ?? TEST_IQAMAH_DELAY_SECONDS;
  const offsetMinutes = getIqamahOffsetMinutes();
  const paired = options?.includeAdhanPair ?? offsetMinutes > 0;

  if (paired) {
    const sound = getPrayerSound();
    await ensurePrayerChannel(sound);
    await ensureNotificationChannel(NOTIFICATION_CHANNELS.prayer);

    const adhanContent = prayerNotificationContent(prayer, sound);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: adhanContent.title,
        body: adhanContent.body,
        data: adhanContent.data,
        sound: adhanContent.sound,
      },
      trigger: intervalTrigger(delaySeconds, prayerChannelId(sound)),
    });

    const iqamahSeconds = delaySeconds + offsetMinutes;
    const iqContent = iqamahNotificationContent(prayer);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: iqContent.title,
        body: iqContent.body,
        data: iqContent.data,
        sound: iqContent.sound,
      },
      trigger: intervalTrigger(iqamahSeconds, NOTIFICATION_CHANNELS.prayer),
    });

    return { sent: true, prayer, offsetMinutes, paired: true, delaySeconds };
  }

  await ensureNotificationChannel(NOTIFICATION_CHANNELS.prayer);
  const iqContent = iqamahNotificationContent(prayer);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: iqContent.title,
      body: iqContent.body,
      data: iqContent.data,
      sound: iqContent.sound,
    },
    trigger: intervalTrigger(delaySeconds, NOTIFICATION_CHANNELS.prayer),
  });

  return { sent: true, prayer, offsetMinutes, paired: false, delaySeconds };
}
