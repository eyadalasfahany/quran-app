import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage } from '@/core/storage/mmkv';

import { setBellEnabled } from './bells';
import { setIqamahOffsetMinutes } from './iqamah-offset';
import { iqamahNotificationContent } from './notifications';
import {
  sendTestIqamahNotification,
  TEST_IQAMAH_DELAY_SECONDS,
  testIqamahPrayer,
} from './test-iqamah';

describe('testIqamahPrayer', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns the first enabled bell in prayer order', () => {
    setBellEnabled('dhuhr', true);
    setBellEnabled('maghrib', true);

    expect(testIqamahPrayer()).toBe('dhuhr');
  });

  it('falls back to asr when every bell is off', () => {
    expect(testIqamahPrayer()).toBe('asr');
  });
});

describe('sendTestIqamahNotification', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    storage.clearAll();
    await i18n.changeLanguage('ar');
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  });

  it('schedules iqamah content with production copy, default sound and deep link', async () => {
    const outcome = await sendTestIqamahNotification({ prayer: 'asr' });

    expect(outcome).toEqual({
      sent: true,
      prayer: 'asr',
      offsetMinutes: 0,
      paired: false,
      delaySeconds: TEST_IQAMAH_DELAY_SECONDS,
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const expected = iqamahNotificationContent('asr');
    const call = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
    expect(call?.content.title).toBe(expected.title);
    expect(call?.content.body).toBe(expected.body);
    expect(call?.content.data).toEqual({ route: '/salah', kind: 'iqamah' });
    expect(call?.content.sound).toBe('default');
    expect(call?.trigger).toEqual(
      expect.objectContaining({ type: 'timeInterval', seconds: 5, repeats: false }),
    );
  });

  it('uses the prayer channel on Android for iqamah', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await sendTestIqamahNotification({ prayer: 'fajr' });

      expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0].trigger).toEqual(
        expect.objectContaining({ channelId: 'prayer' }),
      );
    } finally {
      restore.restore();
    }
  });

  it('on Android uses a DATE trigger with alarm-clock delivery, so the test follows the real prayer path', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      const before = Date.now();
      await sendTestIqamahNotification({ prayer: 'fajr', delaySeconds: 5 });
      const after = Date.now();

      const trigger = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0].trigger as unknown as {
        type: string;
        date: Date;
        channelId: string;
        delivery: string;
      };
      expect(trigger).toMatchObject({ type: 'date', channelId: 'prayer', delivery: 'alarmClock' });
      expect(trigger).not.toHaveProperty('seconds');
      expect(trigger.date.getTime()).toBeGreaterThanOrEqual(before + 5000);
      expect(trigger.date.getTime()).toBeLessThanOrEqual(after + 5000);
    } finally {
      restore.restore();
    }
  });

  it('paused: a stored offset does not pair the test with an adhan; it is iqamah only', async () => {
    setIqamahOffsetMinutes(10);

    const outcome = await sendTestIqamahNotification({ prayer: 'maghrib', delaySeconds: 5 });

    expect(outcome).toMatchObject({ sent: true, paired: false, offsetMinutes: 0 });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const iqCall = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
    const expectedIqamah = iqamahNotificationContent('maghrib');
    expect(iqCall?.content.title).toBe(expectedIqamah.title);
    expect(iqCall?.content.data).toEqual({ route: '/salah', kind: 'iqamah' });
    expect(iqCall?.trigger).toEqual(expect.objectContaining({ seconds: 5 }));
  });

  it('schedules nothing and reports sent false when notifications are refused', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    expect(await sendTestIqamahNotification()).toEqual({ sent: false });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('uses asr when no bells are on and prayer is omitted', async () => {
    await sendTestIqamahNotification();

    const expected = iqamahNotificationContent('asr');
    const call = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
    expect(call?.content.body).toBe(expected.body);
  });
});
