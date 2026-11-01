import {
  AZKAR_ROLLING_DAYS,
  AZKAR_SLOTS,
  DAILY_REMINDER_SLOTS,
  IOS_PENDING_LIMIT,
  PRAYER_NOTIFICATION_SLOTS,
} from './budget';

describe('pending notification budget', () => {
  it('keeps the iOS limit and the reserved slots from the spec', () => {
    expect(IOS_PENDING_LIMIT).toBe(64);
    expect(DAILY_REMINDER_SLOTS).toBe(1);
    expect(PRAYER_NOTIFICATION_SLOTS).toBe(40);
  });

  it('gives Azkar what the daily reminder and the prayer notifications leave', () => {
    expect(AZKAR_SLOTS).toBe(23);
    expect(AZKAR_ROLLING_DAYS).toBe(4);
  });

  it('fits five prayer-relative categories, each with a 4-day window, in the Azkar slots', () => {
    const categories = 5;
    expect(categories * AZKAR_ROLLING_DAYS).toBeLessThanOrEqual(AZKAR_SLOTS);
    // The limit is tight: a sixth category would overflow the pool.
    expect((categories + 1) * AZKAR_ROLLING_DAYS).toBeGreaterThan(AZKAR_SLOTS);
  });

  it('never exceeds the iOS limit with every category at its reserved size', () => {
    expect(DAILY_REMINDER_SLOTS + PRAYER_NOTIFICATION_SLOTS + AZKAR_SLOTS).toBe(IOS_PENDING_LIMIT);
  });
});
