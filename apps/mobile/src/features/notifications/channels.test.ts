import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';

import { ensureNotificationChannel, NOTIFICATION_CHANNELS } from './channels';

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
