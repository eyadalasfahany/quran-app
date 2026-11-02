import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';

import {
  ensureNotificationChannel,
  ensurePrayerChannel,
  NOTIFICATION_CHANNELS,
  prayerChannelId,
  prunePrayerChannels,
} from './channels';

describe('notification channels', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('keeps the daily reminder channel id and names the Azkar channel', () => {
    expect(NOTIFICATION_CHANNELS.reminders).toBe('reminders');
    expect(NOTIFICATION_CHANNELS.azkar).toBe('azkar');
  });

  it('gives prayer notifications their own channel id (ADR 0030 §3)', () => {
    expect(NOTIFICATION_CHANNELS.prayer).toBe('prayer');
  });

  it('names the prayer channel in the interface language', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await ensureNotificationChannel(NOTIFICATION_CHANNELS.prayer);

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'prayer',
        expect.objectContaining({ name: 'إشعارات الصلاة' }),
      );
    } finally {
      restore.restore();
    }
  });

  it('creates the Azkar channel on Android with its Arabic name', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await ensureNotificationChannel(NOTIFICATION_CHANNELS.azkar);

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('azkar', {
        name: 'تذكير الأذكار',
        importance: AndroidImportance.HIGH,
      });
    } finally {
      restore.restore();
    }
  });

  it('names the daily reminder channel in the interface language', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await i18n.changeLanguage('en');
      await ensureNotificationChannel(NOTIFICATION_CHANNELS.reminders);

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'reminders',
        expect.objectContaining({ name: 'Daily reading reminder' }),
      );
    } finally {
      restore.restore();
    }
  });

  it('creates nothing on iOS, which has no channels', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'ios');
    try {
      await ensureNotificationChannel(NOTIFICATION_CHANNELS.azkar);

      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    } finally {
      restore.restore();
    }
  });
});

describe('prayer sound channels (ADR 0047)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('maps each sound to its channel: system keeps prayer, silent is prayer_silent, a voice is prayer_adhan_<id>', () => {
    expect(prayerChannelId('system')).toBe('prayer');
    expect(prayerChannelId('silent')).toBe('prayer_silent');
    expect(prayerChannelId('allahu_akbar_short')).toBe('prayer_adhan_allahu_akbar_short');
    expect(prayerChannelId('makkah')).toBe('prayer_adhan_makkah');
    expect(prayerChannelId('madinah')).toBe('prayer_adhan_madinah');
  });

  it('creates only the selected voice channel, with its file as the sound and its name', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await ensurePrayerChannel('makkah');

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('prayer_adhan_makkah', {
        name: 'الصلاة: المسجد الحرام',
        importance: AndroidImportance.HIGH,
        sound: 'adhan_makkah.wav',
      });
    } finally {
      restore.restore();
    }
  });

  it('creates the silent channel with no sound, set explicitly to null', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await ensurePrayerChannel('silent');

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
      const [id, input] = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls[0] ?? [];
      expect(id).toBe('prayer_silent');
      expect(input).toEqual({ name: 'الصلاة (صامت)', importance: AndroidImportance.HIGH, sound: null });
      expect(input).toHaveProperty('sound', null);
    } finally {
      restore.restore();
    }
  });

  it('keeps the system sound on the existing prayer channel, with no sound key', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await ensurePrayerChannel('system');

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('prayer', {
        name: 'إشعارات الصلاة',
        importance: AndroidImportance.HIGH,
      });
    } finally {
      restore.restore();
    }
  });

  it('names the voice channels in English', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await i18n.changeLanguage('en');
      await ensurePrayerChannel('madinah');
      await ensurePrayerChannel('silent');

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'prayer_adhan_madinah',
        expect.objectContaining({ name: "Prayer: The Prophet's Mosque", sound: 'adhan_madinah.wav' }),
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'prayer_silent',
        expect.objectContaining({ name: 'Prayer (silent)', sound: null }),
      );
    } finally {
      restore.restore();
    }
  });

  it('creates no prayer channel on iOS', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'ios');
    try {
      await ensurePrayerChannel('makkah');
      await prunePrayerChannels();

      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
      expect(Notifications.getNotificationChannelsAsync).not.toHaveBeenCalled();
      expect(Notifications.deleteNotificationChannelAsync).not.toHaveBeenCalled();
    } finally {
      restore.restore();
    }
  });

  it('prunes only the adhan voice channels that are no longer in the catalogue', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      jest.mocked(Notifications.getNotificationChannelsAsync).mockResolvedValueOnce([
        { id: 'prayer' },
        { id: 'prayer_silent' },
        { id: 'prayer_adhan_allahu_akbar_short' },
        { id: 'prayer_adhan_makkah' },
        { id: 'prayer_adhan_retired_voice' },
        { id: 'azkar' },
        { id: 'reminders' },
      ] as never);

      await prunePrayerChannels();

      expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('prayer_adhan_retired_voice');
    } finally {
      restore.restore();
    }
  });

  it('prunes nothing when the device has no channels', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      jest.mocked(Notifications.getNotificationChannelsAsync).mockResolvedValueOnce(null as never);

      await prunePrayerChannels();

      expect(Notifications.deleteNotificationChannelAsync).not.toHaveBeenCalled();
    } finally {
      restore.restore();
    }
  });
});
