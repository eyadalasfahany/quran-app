import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { readReminderTime, syncDailyReminder } from './reminder-service';

jest.mock('@/features/khatma/data', () => ({
  getActivePlan: jest.fn(() => null),
  listLogsForPlan: jest.fn(() => []),
  planProgress: jest.fn(),
  toLocalDateString: jest.fn(() => '2026-10-30'),
}));

jest.mock('@/features/khatma/plan-bounds', () => ({
  resolvePlanBounds: jest.fn(() => null),
}));

jest.mock('@/features/reader/anchor/reading-anchor', () => ({
  resolveInitialAnchor: () => ({ verseKey: '2:255' }),
}));

// The global mock throws; the plan path needs an executor handle (the mocked bounds ignore it).
jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
}));

const { getActivePlan, planProgress } = jest.requireMock('@/features/khatma/data') as {
  getActivePlan: jest.Mock;
  planProgress: jest.Mock;
};
const { resolvePlanBounds } = jest.requireMock('@/features/khatma/plan-bounds') as {
  resolvePlanBounds: jest.Mock;
};

function scheduledContent() {
  const call = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]?.[0];
  expect(call).toBeDefined();
  return call as { content: { title: string; body: string; data: { route: string } }; trigger: unknown };
}

describe('readReminderTime', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('defaults to 21:00 when nothing is stored', () => {
    expect(readReminderTime()).toEqual({ hour: 21, minute: 0 });
  });

  it('reads a stored HH:mm time', () => {
    storage.set(storageKeys.dailyReminderTime, '06:45');

    expect(readReminderTime()).toEqual({ hour: 6, minute: 45 });
  });

  it.each(['99:00', '12:99', 'morning'])('falls back to 21:00 for the invalid %s', (raw) => {
    storage.set(storageKeys.dailyReminderTime, raw);

    expect(readReminderTime()).toEqual({ hour: 21, minute: 0 });
  });
});

describe('syncDailyReminder', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    getActivePlan.mockReturnValue(null);
    resolvePlanBounds.mockReturnValue(null);
    await i18n.changeLanguage('ar');
  });

  it('cancels the stored notification and schedules nothing when the reminder is off', async () => {
    storage.set(storageKeys.dailyReminderNotificationId, 'old-id');

    await syncDailyReminder();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(storage.getString(storageKeys.dailyReminderNotificationId)).toBeUndefined();
  });

  it('schedules at the default 21:00 with the generic body when no plan is active', async () => {
    storage.set(storageKeys.dailyReminder, true);

    await syncDailyReminder();

    const call = scheduledContent();
    expect(call.content.title).toBe('وردك اليومي');
    expect(call.content.body).toBe('حان وقت قراءة وردك من القرآن الكريم');
    expect(call.content.data.route).toBe('/read/2:255');
    expect(call.trigger).toMatchObject({ hour: 21, minute: 0 });
    expect(storage.getString(storageKeys.dailyReminderNotificationId)).toBe('scheduled-notification-id');
  });

  it('schedules at the stored time', async () => {
    storage.set(storageKeys.dailyReminder, true);
    storage.set(storageKeys.dailyReminderTime, '07:30');

    await syncDailyReminder();

    expect(scheduledContent().trigger).toMatchObject({ hour: 7, minute: 30 });
  });

  it('replaces a previously scheduled reminder', async () => {
    storage.set(storageKeys.dailyReminder, true);
    storage.set(storageKeys.dailyReminderNotificationId, 'old-id');

    await syncDailyReminder();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("builds the body from the active plan's wird", async () => {
    storage.set(storageKeys.dailyReminder, true);
    getActivePlan.mockReturnValue({ id: 'plan-1', startVerseId: 1, startDate: '2026-10-01', durationDays: 30 });
    resolvePlanBounds.mockReturnValue({ startPage: 1, pagesTotal: 604 });
    planProgress.mockReturnValue({ todayTarget: 20 });

    await syncDailyReminder();

    const { body } = scheduledContent().content;
    expect(body).toContain('وِردك اليوم:');
    expect(body).toContain('٢٠');
    expect(body).not.toBe('حان وقت قراءة وردك من القرآن الكريم');
  });

  it('falls back to the generic body when the plan data cannot be read', async () => {
    storage.set(storageKeys.dailyReminder, true);
    getActivePlan.mockImplementation(() => {
      throw new Error('user.db closed');
    });

    await syncDailyReminder();

    expect(scheduledContent().content.body).toBe('حان وقت قراءة وردك من القرآن الكريم');
  });

  it('uses a repeating calendar trigger on iOS without a channel', async () => {
    storage.set(storageKeys.dailyReminder, true);

    await syncDailyReminder();

    expect(scheduledContent().trigger).toMatchObject({ type: 'calendar', repeats: true });
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('creates the reminders channel and a daily trigger on Android', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    storage.set(storageKeys.dailyReminder, true);
    try {
      await syncDailyReminder();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', expect.objectContaining({}));
      expect(scheduledContent().trigger).toMatchObject({ type: 'daily', channelId: 'reminders' });
    } finally {
      restore.restore();
    }
  });
});
