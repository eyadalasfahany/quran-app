import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import {
  ADHAN_VOICES,
  adhanVoiceFile,
  type PrayerSoundId,
  prayerSoundName,
} from '@/features/salah/data/adhan-sounds';

/**
 * The Android notification channels the app creates. The ids are stable: a channel keeps its user settings across a
 * rename. Prayer notifications (Phase 5) add their channel here rather than creating their own.
 */
export const NOTIFICATION_CHANNELS = {
  /** The daily Quran reminder. */
  reminders: 'reminders',
  /** Azkar reminders (ADR 0031 §7). */
  azkar: 'azkar',
  /** Prayer-time notifications with the system sound (ADR 0030 §3). */
  prayer: 'prayer',
} as const;

export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

const CHANNEL_NAME_KEYS = {
  reminders: 'notifications.channels.reminders',
  azkar: 'notifications.channels.azkar',
  prayer: 'notifications.channels.prayer',
} as const satisfies Record<NotificationChannelId, string>;

/** Prefix of every adhan voice channel (`prayer_adhan_<voice id>`, ADR 0047 §4). */
const ADHAN_CHANNEL_PREFIX = 'prayer_adhan_';

/** The silent prayer channel: no sound at all (ADR 0047 §4). */
const PRAYER_SILENT_CHANNEL = 'prayer_silent';

/**
 * The Android channel a prayer notification uses for a sound. A channel fixes its sound when it is created, so each
 * voice has its own id and the system sound keeps the original `prayer` channel and its user settings.
 */
export function prayerChannelId(sound: PrayerSoundId): string {
  if (sound === 'system') {
    return NOTIFICATION_CHANNELS.prayer;
  }
  if (sound === 'silent') {
    return PRAYER_SILENT_CHANNEL;
  }
  return `${ADHAN_CHANNEL_PREFIX}${sound}`;
}

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

/**
 * Creates only the channel of the selected prayer sound, on Android. The system sound is the `prayer` channel as before,
 * a voice gets its file as the channel sound, and silent gets `sound: null` (no sound). iOS does nothing.
 */
export async function ensurePrayerChannel(sound: PrayerSoundId): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  if (sound === 'system') {
    await ensureNotificationChannel(NOTIFICATION_CHANNELS.prayer);
    return;
  }
  if (sound === 'silent') {
    await Notifications.setNotificationChannelAsync(PRAYER_SILENT_CHANNEL, {
      name: i18n.t('notifications.channels.prayerSilent'),
      importance: AndroidImportance.HIGH,
      // An explicit null: an absent key would give the default sound.
      sound: null,
    });
    return;
  }
  await Notifications.setNotificationChannelAsync(prayerChannelId(sound), {
    name: i18n.t('notifications.channels.prayerVoice', { name: i18n.t(prayerSoundName(sound)) }),
    importance: AndroidImportance.HIGH,
    sound: adhanVoiceFile(sound),
  });
}

/**
 * Deletes the adhan voice channels that no longer match the catalogue (a voice removed or renamed). The voices in the
 * catalogue keep their channels, so a user's system-level settings survive switching back. Android only.
 */
export async function prunePrayerChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const known = new Set<string>(ADHAN_VOICES.map((voice) => prayerChannelId(voice.id)));
  const channels = (await Notifications.getNotificationChannelsAsync()) ?? [];
  for (const channel of channels) {
    if (channel.id.startsWith(ADHAN_CHANNEL_PREFIX) && !known.has(channel.id)) {
      await Notifications.deleteNotificationChannelAsync(channel.id);
    }
  }
}
