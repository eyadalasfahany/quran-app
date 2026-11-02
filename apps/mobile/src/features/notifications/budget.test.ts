import {
  AZKAR_ROLLING_DAYS,
  AZKAR_SLOTS,
  DAILY_REMINDER_SLOTS,
  FRIDAY_REMINDER_SLOTS,
  IOS_PENDING_LIMIT,
  MISBAHA_REMINDER_SLOTS,
  PRAYER_NOTIFICATION_SLOTS,
  PRAYER_ROLLING_DAYS,
} from './budget';

describe('pending notification budget', () => {
  it('keeps the iOS limit and the reserved slots from the spec', () => {
    expect(IOS_PENDING_LIMIT).toBe(64);
    expect(DAILY_REMINDER_SLOTS).toBe(1);
    expect(PRAYER_NOTIFICATION_SLOTS).toBe(40);
  });

  it('reserves one slot each for the Friday Surat al-Kahf and the misbaha reminders', () => {
    expect(FRIDAY_REMINDER_SLOTS).toBe(1);
    expect(MISBAHA_REMINDER_SLOTS).toBe(1);
  });

  it('gives Azkar what the other categories leave: 21 of the 64', () => {
    expect(AZKAR_SLOTS).toBe(21);
    expect(AZKAR_ROLLING_DAYS).toBe(4);
  });

  it('fits five prayer-relative categories, each with a 4-day window, in the Azkar slots', () => {
    const categories = 5;
    expect(categories * AZKAR_ROLLING_DAYS).toBeLessThanOrEqual(AZKAR_SLOTS);
    // The limit is tight: a sixth category would overflow the pool.
    expect((categories + 1) * AZKAR_ROLLING_DAYS).toBeGreaterThan(AZKAR_SLOTS);
  });

  it('gives prayer notifications an 8-day rolling window per prayer, inside their 40 slots', () => {
    expect(PRAYER_ROLLING_DAYS).toBe(8);
    expect(5 * PRAYER_ROLLING_DAYS).toBe(PRAYER_NOTIFICATION_SLOTS);
  });

  it('never exceeds the iOS limit with every category at its reserved size', () => {
    const reserved =
      DAILY_REMINDER_SLOTS + PRAYER_NOTIFICATION_SLOTS + FRIDAY_REMINDER_SLOTS + MISBAHA_REMINDER_SLOTS + AZKAR_SLOTS;
    expect(reserved).toBe(IOS_PENDING_LIMIT);
  });
});
