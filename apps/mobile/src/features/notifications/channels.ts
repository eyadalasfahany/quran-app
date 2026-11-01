import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';

/**
 * The Android notification channels the app creates. The ids are stable: a channel keeps its user settings across a
 * rename. Prayer notifications (Phase 5) add their channel here rather than creating their own.
 */
export const NOTIFICATION_CHANNELS = {
  /** The daily Quran reminder. */
  reminders: 'reminders',
  /** Azkar reminders (ADR 0031 §7). */
  azkar: 'azkar',
  /** Prayer-time notifications (ADR 0030 §3). */
  prayer: 'prayer',
} as const;

export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

const CHANNEL_NAME_KEYS = {
  reminders: 'notifications.channels.reminders',
  azkar: 'notifications.channels.azkar',
  prayer: 'notifications.channels.prayer',
} as const satisfies Record<NotificationChannelId, string>;

/**
 * Creates the channel on Android. iOS has no channels, so it does nothing there. Safe to call before every schedule:
 * re-creating a channel with the same id updates it in place.
 */
export async function ensureNotificationChannel(id: NotificationChannelId): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(id, {
    name: i18n.t(CHANNEL_NAME_KEYS[id]),
    // HIGH lets a reminder show as a heads-up pop-up. Android fixes a channel's importance at creation, so an
    // install that already has this channel keeps its old importance until the channel gets a new id.
    importance: AndroidImportance.HIGH,
  });
}
