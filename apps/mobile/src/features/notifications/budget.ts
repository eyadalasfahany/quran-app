/**
 * The pending local-notification budget (spec §13, ADR 0031 §7). iOS keeps at most 64 pending notifications per app,
 * so every local-notification category shares that pool. The daily Quran reminder takes one slot, Phase 5 prayer
 * notifications take up to 40, and Azkar reminders get the rest. Keep these constants generic: other categories read
 * them too.
 */

/** iOS allows this many pending local notifications per app. */
export const IOS_PENDING_LIMIT = 64;

/** The daily Quran reminder: one repeating trigger. */
export const DAILY_REMINDER_SLOTS = 1;

/** Phase 5 prayer notifications: at most this many pending. */
export const PRAYER_NOTIFICATION_SLOTS = 40;

/** Prayer notifications keep a rolling window of this many days per enabled prayer (ADR 0030 §3): 5 prayers × 8 days. */
export const PRAYER_ROLLING_DAYS = 8;

/** What Azkar reminders may hold: everything the other categories do not reserve. */
export const AZKAR_SLOTS = IOS_PENDING_LIMIT - DAILY_REMINDER_SLOTS - PRAYER_NOTIFICATION_SLOTS;

/**
 * A prayer-relative Azkar reminder keeps one DATE trigger per fire date, for at most this many fire dates. The window
 * rolls forward on every sync. Clock reminders use one repeating trigger and take no window.
 */
export const AZKAR_ROLLING_DAYS = 4;
