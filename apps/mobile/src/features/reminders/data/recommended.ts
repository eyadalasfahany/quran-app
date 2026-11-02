import { storage, storageKeys } from '@/core/storage/mmkv';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import { listReminders, saveReminder } from '@/features/azkar/reminders/reminders-repository';
import { ensureReminderPermission } from '@/features/notifications/permission';
import { BELL_PRAYERS, getBellEnabled, setBellEnabled } from '@/features/salah/data/bells';
import { resyncPrayerNotifications } from '@/features/salah/data/notifications';

import { readFridayReminder, readMisbahaReminder, writeFridayReminder } from './goal-settings';
import { resyncGoalReminders } from './goal-sync';

/**
 * The recommended set (ADR 0034 amendment, 2 Nov 2026): offered once, after the user allows notifications, and turned on
 * only by one tap. It enables the five prayer bells, the morning Azkar after Fajr and the evening Azkar after Asr (offset 0,
 * no clock time), and the Friday Surat al-Kahf at the Dhuhr time. Nothing fires before the tap, and each item can be
 * turned off.
 */

/** The Azkar categories in the set and the prayer each one follows, at offset 0. */
export const RECOMMENDED_AZKAR = [
  { targetKey: 'morning', prayer: 'fajr' },
  { targetKey: 'evening', prayer: 'asr' },
] as const;

/** Whether the user has any reminder on: a prayer bell, the daily reading reminder, an Azkar reminder or a goal reminder. */
export function isAnyReminderOn(): boolean {
  return (
    BELL_PRAYERS.some((prayer) => getBellEnabled(prayer)) ||
    storage.getBoolean(storageKeys.dailyReminder) === true ||
    listReminders().some((reminder) => reminder.enabled) ||
    readFridayReminder().enabled ||
    readMisbahaReminder().enabled
  );
}

/** Whether the set should be offered now: never offered before, and nothing is on yet. */
export function isRecommendedSetDue(): boolean {
  return storage.getBoolean(storageKeys.reminders.recommendedShown) !== true && !isAnyReminderOn();
}

/** Records that the set was offered, so it is shown once whatever the user chose. */
export function markRecommendedSetShown(): void {
  storage.set(storageKeys.reminders.recommendedShown, true);
}

/**
 * Turns on the recommended set. Needs notification permission; resolves to false, and changes nothing, when it is refused.
 * With no Azkar content (`hasAzkar` false) the two Azkar items are skipped, since they would open an empty screen.
 */
export async function applyRecommendedSet({ now = new Date(), hasAzkar }: { now?: Date; hasAzkar: boolean }): Promise<boolean> {
  const granted = await ensureReminderPermission().catch(() => false);
  if (!granted) {
    return false;
  }
  for (const prayer of BELL_PRAYERS) {
    setBellEnabled(prayer, true);
  }
  await resyncPrayerNotifications(now);

  if (hasAzkar) {
    for (const { targetKey, prayer } of RECOMMENDED_AZKAR) {
      saveReminder({
        targetType: 'category',
        targetKey,
        enabled: true,
        triggerType: 'prayer_relative',
        clockTime: null,
        prayer,
        offsetMinutes: 0,
      });
    }
    await resyncAzkarReminders(now);
  }

  writeFridayReminder({ enabled: true, mode: 'dhuhr', clockTime: null });
  await resyncGoalReminders(now);
  markRecommendedSetShown();
  return true;
}
