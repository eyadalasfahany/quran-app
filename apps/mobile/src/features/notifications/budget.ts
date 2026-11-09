import { Platform, type PlatformOSType } from 'react-native';

/**
 * The pending local-notification budget (spec §13, ADR 0031 §7, ADR 0083). iOS keeps at most 64 pending notifications per
 * app, so every local-notification category shares that pool. The daily Quran reminder takes one slot, Phase 5 prayer
 * notifications take up to 40, the renew reminder (ADR 0083) takes one, and Azkar reminders get the rest. The 64 limit
 * is iOS-only: Android has no such cap, so its prayer window is longer. Keep these constants generic: other categories
 * read them too.
 */

/** iOS allows this many pending local notifications per app. */
export const IOS_PENDING_LIMIT = 64;

/** The daily Quran reminder: one repeating trigger. */
export const DAILY_REMINDER_SLOTS = 1;

/** Phase 5 prayer notifications: at most this many pending. */
export const PRAYER_NOTIFICATION_SLOTS = 40;

/** Adhan-only rolling window per enabled prayer on iOS (ADR 0030 §3, ADR 0056): 5 prayers × 8 days = 40 slots. */
export const PRAYER_ROLLING_DAYS_ADHAN_ONLY = 8;

/** When iqamah offset is on, adhan and iqamah each keep this many future fires per enabled prayer on iOS (ADR 0056). */
export const PRAYER_ROLLING_DAYS_WITH_IQAMAH = 4;

/** Adhan-only rolling window per enabled prayer on Android (ADR 0083): AlarmManager allows ~500 per app, so 5 × 14 = 70. */
export const ANDROID_PRAYER_ROLLING_DAYS_ADHAN_ONLY = 14;

/** Android window with iqamah on (ADR 0083): adhan and iqamah each keep 7 days, 5 × 7 × 2 = 70 per app. */
export const ANDROID_PRAYER_ROLLING_DAYS_WITH_IQAMAH = 7;

/** @deprecated alias — use `prayerRollingDays(getIqamahOffsetMinutes())` in new code. */
export const PRAYER_ROLLING_DAYS = PRAYER_ROLLING_DAYS_ADHAN_ONLY;

/** The prayer window in days for the platform: longer on Android, where there is no 64 cap (ADR 0083). */
export function prayerRollingDays(iqamahOffsetMinutes: number, platform: PlatformOSType = Platform.OS): number {
  if (platform === 'android') {
    return iqamahOffsetMinutes > 0 ? ANDROID_PRAYER_ROLLING_DAYS_WITH_IQAMAH : ANDROID_PRAYER_ROLLING_DAYS_ADHAN_ONLY;
  }
  return iqamahOffsetMinutes > 0 ? PRAYER_ROLLING_DAYS_WITH_IQAMAH : PRAYER_ROLLING_DAYS_ADHAN_ONLY;
}

/** Max pending prayer notifications with the given offset and enabled prayer count (ADR 0056, ADR 0083). */
export function maxPrayerPendingCount(
  iqamahOffsetMinutes: number,
  enabledPrayerCount: number,
  platform: PlatformOSType = Platform.OS,
): number {
  const days = prayerRollingDays(iqamahOffsetMinutes, platform);
  const kinds = iqamahOffsetMinutes > 0 ? 2 : 1;
  return enabledPrayerCount * days * kinds;
}

/** The Friday Surat al-Kahf reminder: one weekly repeating trigger (`features/reminders`). */
export const FRIDAY_REMINDER_SLOTS = 1;

/** The misbaha daily target reminder: one daily repeating trigger (`features/reminders`). */
export const MISBAHA_REMINDER_SLOTS = 1;

/** The renew reminder (ADR 0083): one DATE trigger, asks the user to open Taybah before a schedule runs out. */
export const RENEW_REMINDER_SLOTS = 1;

/** What Azkar reminders may hold: everything the other categories do not reserve. */
export const AZKAR_SLOTS =
  IOS_PENDING_LIMIT -
  DAILY_REMINDER_SLOTS -
  PRAYER_NOTIFICATION_SLOTS -
  FRIDAY_REMINDER_SLOTS -
  MISBAHA_REMINDER_SLOTS -
  RENEW_REMINDER_SLOTS;

/**
 * A prayer-relative Azkar reminder keeps one DATE trigger per fire date, for at most this many fire dates. The window
 * rolls forward on every sync. Clock reminders use one repeating trigger and take no window.
 */
export const AZKAR_ROLLING_DAYS = 4;
