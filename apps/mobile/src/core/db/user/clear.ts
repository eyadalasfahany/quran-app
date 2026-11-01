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
] as const;

export function clearLocalUserData(executor?: SqlExecutor): void {
  const db = executor ?? openUserDb().executor;
  for (const table of PERSONAL_TABLES) {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch {
      // Some tables are planned for future steps and may not exist yet in user.db.
    }
  }

  storage.remove(storageKeys.searchRecentQueries);
  storage.remove(storageKeys.readerLastVerseKey);
  storage.remove(storageKeys.readerLastPage);
  storage.remove(storageKeys.audioLastPosition);
  storage.remove(storageKeys.azkar.recentScopes);
  storage.remove(storageKeys.sibha.state);
  storage.remove(storageKeys.sibha.today);
  storage.remove(storageKeys.dailyGoals);
}
