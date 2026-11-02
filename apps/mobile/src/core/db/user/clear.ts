import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { openUserDb } from './open';

export const PERSONAL_TABLES = [
  'bookmarks',
  'highlights',
  'notes',
  'khatma_plans',
  'khatma_logs',
  'reading_position',
  'recent_listens',
  'search_history',
  'azkar_favorites',
  'azkar_progress',
  'azkar_reminders',
  'my_duas',
  'dua_favorites',
] as const;

/**
 * The MMKV keys of personal state, removed by «مسح البيانات» (ADR 0027). Each key is decided here:
 * - Personal, removed: recent searches, the last reading and listening place, the daily reading reminder (on, time and
 *   the notification id), the Azkar search history and recent scopes, misbaha, daily goals, the Hijri adjustment, the
 *   reminders hub (Friday, misbaha, the recommended-set offer), the five prayer bells and the widget snapshot (its
 *   numbers; the widgets show the open-the-app state after this).
 * - Device settings, kept: the language, the appearance and dark-after-Maghrib, the reader and audio display and
 *   download preferences, the reciter, onboarding, the content pack state, the Azkar font scale and variant choice,
 *   the Salah location choice and the QCF font cache.
 */
export const PERSONAL_STORAGE_KEYS: readonly string[] = [
  storageKeys.searchRecentQueries,
  storageKeys.readerLastVerseKey,
  storageKeys.readerLastPage,
  storageKeys.audioLastPosition,
  storageKeys.dailyReminder,
  storageKeys.dailyReminderTime,
  storageKeys.dailyReminderNotificationId,
  storageKeys.azkar.recentScopes,
  storageKeys.azkar.searchRecent,
  storageKeys.sibha.state,
  storageKeys.sibha.today,
  storageKeys.dailyGoals,
  storageKeys.hijriAdjustDays,
  storageKeys.widgets.snapshot,
  storageKeys.widgets.lastMergedWidgetTaps,
  storageKeys.widgets.watchMerge,
  storageKeys.reminders.friday,
  storageKeys.reminders.misbaha,
  storageKeys.reminders.recommendedShown,
  storageKeys.salah.bellFajr,
  storageKeys.salah.bellDhuhr,
  storageKeys.salah.bellAsr,
  storageKeys.salah.bellMaghrib,
  storageKeys.salah.bellIsha,
];

/**
 * Schedule caches: the day, zone and coordinates the last reminder sync used. A resync after a clear writes them again
 * (with nothing scheduled), so they are removed once the resyncs have run (features/settings/data/clear-personal-data.ts).
 * The prayer sync keeps its settings record under the key derived from its sync state, as in its module.
 */
export const SCHEDULE_CACHE_KEYS: readonly string[] = [
  storageKeys.azkar.remindersSync,
  storageKeys.reminders.goalsSync,
  storageKeys.salah.notificationsSync,
  `${storageKeys.salah.notificationsSync}.settings`,
];

export function clearLocalUserData(executor?: SqlExecutor): void {
  const db = executor ?? openUserDb().executor;
  for (const table of PERSONAL_TABLES) {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch {
      // Some tables are planned for future steps and may not exist yet in user.db.
    }
  }

  for (const key of [...PERSONAL_STORAGE_KEYS, ...SCHEDULE_CACHE_KEYS]) {
    storage.remove(key);
  }
}
