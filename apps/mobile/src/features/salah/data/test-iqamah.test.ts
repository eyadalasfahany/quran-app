import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage } from '@/core/storage/mmkv';

import { setBellEnabled } from './bells';
import { setIqamahOffsetMinutes } from './iqamah-offset';
import { iqamahNotificationContent, prayerNotificationContent } from './notifications';
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

  it('schedules adhan first then iqamah when offset is on', async () => {
    setIqamahOffsetMinutes(10);

    const outcome = await sendTestIqamahNotification({ prayer: 'maghrib', delaySeconds: 5 });

    expect(outcome).toMatchObject({ sent: true, paired: true, offsetMinutes: 10 });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    const adhanCall = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
    const iqCall = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[1]?.[0];
    const expectedAdhan = prayerNotificationContent('maghrib');
    const expectedIqamah = iqamahNotificationContent('maghrib');
    expect(adhanCall?.content.title).toBe(expectedAdhan.title);
    expect(adhanCall?.content.body).toBe(expectedAdhan.body);
    expect(adhanCall?.content.data).toEqual({ route: '/salah' });
    expect(adhanCall?.trigger).toEqual(expect.objectContaining({ seconds: 5 }));
    expect(iqCall?.content.title).toBe(expectedIqamah.title);
    expect(iqCall?.content.data).toEqual({ route: '/salah', kind: 'iqamah' });
    expect(iqCall?.trigger).toEqual(expect.objectContaining({ seconds: 15 }));
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
