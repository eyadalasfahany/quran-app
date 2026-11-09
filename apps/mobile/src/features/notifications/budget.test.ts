import {
  ANDROID_PRAYER_ROLLING_DAYS_ADHAN_ONLY,
  ANDROID_PRAYER_ROLLING_DAYS_WITH_IQAMAH,
  AZKAR_ROLLING_DAYS,
  AZKAR_SLOTS,
  DAILY_REMINDER_SLOTS,
  FRIDAY_REMINDER_SLOTS,
  IOS_PENDING_LIMIT,
  MISBAHA_REMINDER_SLOTS,
  maxPrayerPendingCount,
  PRAYER_NOTIFICATION_SLOTS,
  PRAYER_ROLLING_DAYS,
  PRAYER_ROLLING_DAYS_ADHAN_ONLY,
  PRAYER_ROLLING_DAYS_WITH_IQAMAH,
  prayerRollingDays,
  RENEW_REMINDER_SLOTS,
} from './budget';

describe('pending notification budget', () => {
  it('keeps the iOS limit and the reserved slots from the spec', () => {
    expect(IOS_PENDING_LIMIT).toBe(64);
    expect(DAILY_REMINDER_SLOTS).toBe(1);
    expect(PRAYER_NOTIFICATION_SLOTS).toBe(40);
  });

  it('reserves one slot each for the Friday Surat al-Kahf, the misbaha and the renew reminders', () => {
    expect(FRIDAY_REMINDER_SLOTS).toBe(1);
    expect(MISBAHA_REMINDER_SLOTS).toBe(1);
    expect(RENEW_REMINDER_SLOTS).toBe(1);
  });

  it('gives Azkar what the other categories leave: 20 of the 64', () => {
    expect(AZKAR_SLOTS).toBe(20);
    expect(AZKAR_ROLLING_DAYS).toBe(4);
  });

  it('fits five prayer-relative categories, each with a 4-day window, in the Azkar slots', () => {
    const categories = 5;
    expect(categories * AZKAR_ROLLING_DAYS).toBeLessThanOrEqual(AZKAR_SLOTS);
    expect((categories + 1) * AZKAR_ROLLING_DAYS).toBeGreaterThan(AZKAR_SLOTS);
  });

  it('gives prayer notifications an 8-day rolling window per prayer on iOS, inside their 40 slots', () => {
    expect(PRAYER_ROLLING_DAYS).toBe(8);
    expect(PRAYER_ROLLING_DAYS_ADHAN_ONLY).toBe(8);
    expect(5 * PRAYER_ROLLING_DAYS).toBe(PRAYER_NOTIFICATION_SLOTS);
  });

  it('shrinks the iOS rolling window to 4 days per kind when iqamah offset is on (ADR 0056)', () => {
    expect(prayerRollingDays(0, 'ios')).toBe(8);
    expect(prayerRollingDays(10, 'ios')).toBe(4);
    expect(PRAYER_ROLLING_DAYS_WITH_IQAMAH).toBe(4);
    expect(5 * 4 * 2).toBe(PRAYER_NOTIFICATION_SLOTS);
    expect(maxPrayerPendingCount(10, 5, 'ios')).toBe(40);
    expect(maxPrayerPendingCount(0, 5, 'ios')).toBe(40);
  });

  it('gives Android a 14-day window adhan-only and 7 days with iqamah (ADR 0083)', () => {
    expect(ANDROID_PRAYER_ROLLING_DAYS_ADHAN_ONLY).toBe(14);
    expect(ANDROID_PRAYER_ROLLING_DAYS_WITH_IQAMAH).toBe(7);
    expect(prayerRollingDays(0, 'android')).toBe(14);
    expect(prayerRollingDays(10, 'android')).toBe(7);
  });

  it('counts the max prayer pending on each platform: 40 on iOS, 70 on Android', () => {
    expect(maxPrayerPendingCount(0, 5, 'ios')).toBe(40);
    expect(maxPrayerPendingCount(10, 5, 'ios')).toBe(40);
    expect(maxPrayerPendingCount(0, 5, 'android')).toBe(70);
    expect(maxPrayerPendingCount(10, 5, 'android')).toBe(70);
  });

  it('defaults the platform to the running one', () => {
    expect(prayerRollingDays(0)).toBe(prayerRollingDays(0, 'ios'));
    expect(maxPrayerPendingCount(0, 5)).toBe(maxPrayerPendingCount(0, 5, 'ios'));
  });

  it('never exceeds the iOS limit with every category at its reserved size', () => {
    const reserved =
      DAILY_REMINDER_SLOTS +
      PRAYER_NOTIFICATION_SLOTS +
      FRIDAY_REMINDER_SLOTS +
      MISBAHA_REMINDER_SLOTS +
      RENEW_REMINDER_SLOTS +
      AZKAR_SLOTS;
    expect(reserved).toBe(IOS_PENDING_LIMIT);
  });
});
