import { formatTime } from '@/core/i18n';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

import { reminderClockLabel } from './reminder-time';

const BASE: AzkarReminder = {
  id: 'r-1',
  targetType: 'my_dua',
  targetKey: 'dua-1',
  enabled: true,
  triggerType: 'clock',
  clockTime: '07:05',
  prayer: null,
  offsetMinutes: null,
  notificationIds: [],
  updatedAt: 1,
};

describe('reminderClockLabel', () => {
  it('formats the clock time for the locale', () => {
    const expected = formatTime(new Date(2026, 0, 1, 7, 5), 'en');
    expect(reminderClockLabel(BASE, 'en')).toBe(expected);
    expect(reminderClockLabel(BASE, 'ar')).toBe(formatTime(new Date(2026, 0, 1, 7, 5), 'ar'));
  });

  it('gives nothing without a reminder', () => {
    expect(reminderClockLabel(null, 'en')).toBeNull();
  });

  it('gives nothing when the reminder is off', () => {
    expect(reminderClockLabel({ ...BASE, enabled: false }, 'en')).toBeNull();
  });

  it('gives nothing for a prayer-relative reminder', () => {
    expect(reminderClockLabel({ ...BASE, triggerType: 'prayer_relative', prayer: 'fajr', offsetMinutes: 0 }, 'en')).toBeNull();
  });

  it('gives nothing when the clock time is missing', () => {
    expect(reminderClockLabel({ ...BASE, clockTime: null }, 'en')).toBeNull();
  });
});
