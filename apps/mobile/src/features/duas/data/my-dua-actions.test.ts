import * as Notifications from 'expo-notifications';

import { getReminder } from '@/features/azkar/reminders/reminders-repository';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';

import { deleteMyDua, updateMyDua } from './my-duas-repository';
import { editMyDua, removeMyDua } from './my-dua-actions';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/azkar/reminders/reminders-repository', () => ({
  getReminder: jest.fn(() => null),
}));

jest.mock('@/features/azkar/reminders/resync', () => ({
  resyncAzkarReminders: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('./my-duas-repository', () => ({
  deleteMyDua: jest.fn(),
  updateMyDua: jest.fn(),
}));

const REMINDER = {
  id: 'r-1',
  targetType: 'my_dua' as const,
  targetKey: 'dua-1',
  enabled: true,
  triggerType: 'clock' as const,
  clockTime: '07:00',
  prayer: null,
  offsetMinutes: null,
  notificationIds: ['notif-1', 'notif-2'],
  updatedAt: 1,
};

/** Lets the background cancel and re-plan finish. */
function flushBackground(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('my dua actions', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getReminder).mockReturnValue(null);
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation(() => Promise.resolve());
    jest.mocked(resyncAzkarReminders).mockImplementation(() => Promise.resolve(null));
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('removeMyDua', () => {
    it('reads the reminder before the delete, then cancels its ids once the row is gone', async () => {
      jest.mocked(getReminder).mockReturnValue(REMINDER);

      removeMyDua('dua-1');
      await flushBackground();

      expect(getReminder).toHaveBeenCalledWith('my_dua', 'dua-1');
      const readOrder = jest.mocked(getReminder).mock.invocationCallOrder[0] ?? 0;
      const deleteOrder = jest.mocked(deleteMyDua).mock.invocationCallOrder[0] ?? 0;
      const cancelOrder = jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.invocationCallOrder[0] ?? 0;
      expect(readOrder).toBeLessThan(deleteOrder);
      expect(deleteOrder).toBeLessThan(cancelOrder);
      expect(deleteMyDua).toHaveBeenCalledWith('dua-1');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-2');
      expect(resyncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('cancels nothing and re-plans nothing when the dua has no reminder', async () => {
      removeMyDua('dua-1');
      await flushBackground();

      expect(deleteMyDua).toHaveBeenCalledWith('dua-1');
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
      expect(resyncAzkarReminders).not.toHaveBeenCalled();
    });

    it('does not throw when a cancel fails, and still cancels the rest and re-plans', async () => {
      jest.mocked(getReminder).mockReturnValue(REMINDER);
      jest
        .mocked(Notifications.cancelScheduledNotificationAsync)
        .mockImplementationOnce(() => Promise.reject(new Error('FIXTURE cancel failure')));

      expect(() => removeMyDua('dua-1')).not.toThrow();
      await flushBackground();

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalled();
      expect(resyncAzkarReminders).toHaveBeenCalledTimes(1);
    });
  });

  describe('editMyDua', () => {
    const input = { title: null, body: 'FIXTURE text 1 — not a dua' };

    it('saves the edit and re-plans when the dua has a reminder', async () => {
      jest.mocked(getReminder).mockReturnValue(REMINDER);

      editMyDua('dua-1', input);
      await flushBackground();

      expect(updateMyDua).toHaveBeenCalledWith('dua-1', input);
      expect(resyncAzkarReminders).toHaveBeenCalledTimes(1);
    });

    it('saves the edit and does not re-plan when the dua has no reminder', async () => {
      editMyDua('dua-1', input);
      await flushBackground();

      expect(updateMyDua).toHaveBeenCalledWith('dua-1', input);
      expect(resyncAzkarReminders).not.toHaveBeenCalled();
    });

    it('does not throw when the re-plan fails', async () => {
      jest.mocked(getReminder).mockReturnValue(REMINDER);
      jest.mocked(resyncAzkarReminders).mockImplementationOnce(() => Promise.reject(new Error('FIXTURE resync failure')));

      expect(() => editMyDua('dua-1', input)).not.toThrow();
      await flushBackground();

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
