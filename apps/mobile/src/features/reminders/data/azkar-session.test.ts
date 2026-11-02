import { canScheduleAzkarReminder } from '@/features/azkar/reminders/budget-plan';
import { getReminder, saveReminder } from '@/features/azkar/reminders/reminders-repository';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import { ensureReminderPermission } from '@/features/notifications/permission';

import { setAzkarSessionReminder } from './azkar-session';

jest.mock('@/features/azkar/reminders/budget-plan', () => ({ canScheduleAzkarReminder: jest.fn(() => true) }));
jest.mock('@/features/azkar/reminders/reminders-repository', () => ({
  getReminder: jest.fn(() => null),
  saveReminder: jest.fn(),
}));
jest.mock('@/features/azkar/reminders/resync', () => ({ resyncAzkarReminders: jest.fn(() => Promise.resolve(null)) }));
jest.mock('@/features/notifications/permission', () => ({ ensureReminderPermission: jest.fn(() => Promise.resolve(true)) }));

describe('setAzkarSessionReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getReminder).mockReturnValue(null);
    jest.mocked(canScheduleAzkarReminder).mockReturnValue(true);
    jest.mocked(ensureReminderPermission).mockResolvedValue(true);
  });

  it('turns a session on with no time chosen, as the sheet does', async () => {
    expect(await setAzkarSessionReminder('morning', true)).toBe('saved');

    expect(saveReminder).toHaveBeenCalledWith({
      targetType: 'category',
      targetKey: 'morning',
      enabled: true,
      triggerType: 'clock',
      clockTime: null,
      prayer: null,
      offsetMinutes: null,
    });
    expect(resyncAzkarReminders).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved trigger when a session is turned on again', async () => {
    jest.mocked(getReminder).mockReturnValue({
      id: 'r1',
      targetType: 'category',
      targetKey: 'evening',
      enabled: false,
      triggerType: 'prayer_relative',
      clockTime: null,
      prayer: 'asr',
      offsetMinutes: 10,
      notificationIds: [],
      updatedAt: 1,
    });

    await setAzkarSessionReminder('evening', true);

    expect(saveReminder).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: 'prayer_relative', prayer: 'asr', offsetMinutes: 10, enabled: true }),
    );
  });

  it('refuses a turn-on the pending pool cannot hold, and writes nothing', async () => {
    jest.mocked(canScheduleAzkarReminder).mockReturnValueOnce(false);

    expect(await setAzkarSessionReminder('travel', true)).toBe('limit');
    expect(saveReminder).not.toHaveBeenCalled();
    expect(ensureReminderPermission).not.toHaveBeenCalled();
  });

  it('keeps the switch off when permission is refused', async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValueOnce(false);

    expect(await setAzkarSessionReminder('morning', true)).toBe('denied');
    expect(saveReminder).not.toHaveBeenCalled();
  });

  it('turns a session off without asking for anything', async () => {
    jest.mocked(canScheduleAzkarReminder).mockReturnValueOnce(false);

    expect(await setAzkarSessionReminder('morning', false)).toBe('saved');
    expect(saveReminder).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(ensureReminderPermission).not.toHaveBeenCalled();
  });
});
