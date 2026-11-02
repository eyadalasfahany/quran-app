import { i18n } from '@/core/i18n';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

import { azkarDetail } from './azkar-detail';

function reminder(patch: Partial<AzkarReminder>): AzkarReminder {
  return {
    id: 'r1',
    targetType: 'category',
    targetKey: 'morning',
    enabled: true,
    triggerType: 'clock',
    clockTime: '06:30',
    prayer: null,
    offsetMinutes: null,
    notificationIds: [],
    updatedAt: 1,
    ...patch,
  };
}

describe('azkarDetail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('has no detail when the reminder is missing or off', () => {
    expect(azkarDetail(null, 'ar')).toBeUndefined();
    expect(azkarDetail(reminder({ enabled: false }), 'ar')).toBeUndefined();
  });

  it('shows the chosen clock time', () => {
    const detail = azkarDetail(reminder({ clockTime: '06:30' }), 'ar');

    expect(detail).toBeTruthy();
    expect(detail).not.toMatch(/·/);
  });

  it('shows the prayer and «عند الصلاة» for an offset of zero', () => {
    expect(azkarDetail(reminder({ triggerType: 'prayer_relative', prayer: 'fajr', offsetMinutes: 0 }), 'ar')).toBe(
      'الفجر · عند الصلاة',
    );
  });

  it('shows the prayer and the offset in minutes for a later offset', () => {
    const detail = azkarDetail(reminder({ triggerType: 'prayer_relative', prayer: 'asr', offsetMinutes: 10 }), 'ar');

    expect(detail).toContain('العصر · ');
    expect(detail).toContain('بعد');
  });

  it('shows nothing for a prayer-relative reminder with no prayer chosen', () => {
    expect(azkarDetail(reminder({ triggerType: 'prayer_relative', prayer: null, offsetMinutes: 0 }), 'ar')).toBeUndefined();
  });
});
