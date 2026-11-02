import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';

import { REMINDERS_ROUTE, sendTestReminder, TEST_REMINDER_DELAY_SECONDS } from './test-reminder';

describe('sendTestReminder', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  });

  it('fires a notification five seconds out through the time-interval trigger', async () => {
    const sent = await sendTestReminder();

    expect(sent).toBe(true);
    expect(TEST_REMINDER_DELAY_SECONDS).toBe(5);
    const call = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
    expect(call?.trigger).toEqual(expect.objectContaining({ type: 'timeInterval', seconds: 5, repeats: false }));
    expect(call?.content.title).toBe('طيبة');
    expect(call?.content.data).toEqual({ route: REMINDERS_ROUTE, reminder: 'test' });
  });

  it('uses the goals channel on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await sendTestReminder();

      expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0].trigger).toEqual(
        expect.objectContaining({ channelId: 'goals' }),
      );
    } finally {
      restore.restore();
    }
  });

  it('can schedule a later one for a background check on a device', async () => {
    await sendTestReminder(120);

    expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0].trigger).toEqual(
      expect.objectContaining({ seconds: 120 }),
    );
  });

  it('schedules nothing and reports false when notifications are refused', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    expect(await sendTestReminder()).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
