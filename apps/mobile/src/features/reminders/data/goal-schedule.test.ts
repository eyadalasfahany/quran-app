import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';

import { KAHF_ROUTE } from './friday';
import { scheduleFridayReminder, scheduleMisbahaReminder, MISBAHA_ROUTE } from './goal-schedule';
import { timesFor } from '@/features/salah/data/prayer-times';

jest.mock('@/features/salah/data/prayer-times', () => ({
  timesFor: jest.fn(),
}));

const NOW = new Date(2026, 2, 26, 9);
const COORDS = { lat: 30.04, lng: 31.24 };

function scheduled() {
  const call = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.at(-1)?.[0];
  expect(call).toBeDefined();
  return call as unknown as { content: { title: string; body: string; data: { route: string; reminder: string } }; trigger: Record<string, unknown> };
}

describe('scheduleFridayReminder', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
    jest.mocked(timesFor).mockReturnValue({ dhuhr: new Date(2026, 2, 27, 12, 20) } as never);
  });

  it('schedules one weekly notification on Friday at the Dhuhr time, opening the Kahf reader', async () => {
    const result = await scheduleFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null }, NOW, COORDS);

    expect(result).toBe('scheduled');
    const call = scheduled();
    expect(call.trigger).toEqual(expect.objectContaining({ type: 'weekly', weekday: 6, hour: 12, minute: 20 }));
    expect(call.content.data).toEqual({ route: KAHF_ROUTE, reminder: 'friday' });
    expect(call.content.title).toBe('سورة الكهف يوم الجمعة');
  });

  it('uses the Android goals channel on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await scheduleFridayReminder({ enabled: true, mode: 'clock', clockTime: '07:05' }, NOW, null);

      expect(scheduled().trigger).toEqual(expect.objectContaining({ channelId: 'goals', hour: 7, minute: 5 }));
    } finally {
      restore.restore();
    }
  });

  it('schedules nothing while off, and cancels a pending Friday notification', async () => {
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
      { identifier: 'old-friday', content: { data: { reminder: 'friday' } } },
      { identifier: 'keep', content: { data: { reminder: 'misbaha' } } },
    ] as never);

    const result = await scheduleFridayReminder({ enabled: false, mode: 'dhuhr', clockTime: null }, NOW, COORDS);

    expect(result).toBe('off');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-friday');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('keep');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('asks for a location in Dhuhr mode when there is none, and schedules nothing', async () => {
    const result = await scheduleFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null }, NOW, null);

    expect(result).toBe('needsLocation');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('asks for a time in clock mode when none is chosen', async () => {
    const result = await scheduleFridayReminder({ enabled: true, mode: 'clock', clockTime: null }, NOW, COORDS);

    expect(result).toBe('needsTime');
  });
});

describe('scheduleMisbahaReminder', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('schedules a daily notification at the chosen time, opening the misbaha', async () => {
    const result = await scheduleMisbahaReminder({ enabled: true, clockTime: '21:30' });

    expect(result).toBe('scheduled');
    const call = scheduled();
    expect(call.trigger).toEqual(expect.objectContaining({ type: 'calendar', hour: 21, minute: 30, repeats: true }));
    expect(call.content.data).toEqual({ route: MISBAHA_ROUTE, reminder: 'misbaha' });
    expect(MISBAHA_ROUTE).toBe('/sibha');
  });

  it('uses the daily trigger on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await scheduleMisbahaReminder({ enabled: true, clockTime: '06:00' });

      expect(scheduled().trigger).toEqual(expect.objectContaining({ type: 'daily', hour: 6, minute: 0, channelId: 'goals' }));
    } finally {
      restore.restore();
    }
  });

  it('never suggests a time: an enabled reminder with no time schedules nothing', async () => {
    const result = await scheduleMisbahaReminder({ enabled: true, clockTime: null });

    expect(result).toBe('needsTime');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
