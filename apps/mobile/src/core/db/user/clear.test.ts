import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { clearLocalUserData, PERSONAL_TABLES } from './clear';
import { configureUserDatabase } from './pragmas';

const migrationsDir = join(process.cwd(), 'src/core/db/user/migrations');

function openMigrated(): { database: DatabaseSync; executor: SqlExecutor } {
  const opened = openNodeSqlite(':memory:');
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, migrationsDir);
  return opened;
}

describe('clearLocalUserData', () => {
  it('defines the expected personal tables list', () => {
    expect(PERSONAL_TABLES).toEqual([
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
    ]);
  });

  it('empties the azkar personal tables', () => {
    const { database, executor } = openMigrated();

    executor.exec(
      `INSERT INTO azkar_favorites (entry_key, created_at) VALUES ('taybah-dev-fixture:entry-1', 100);`,
    );
    executor.exec(
      `INSERT INTO azkar_progress (scope_key, period_key, item_key, current_count, completed_at, updated_at) VALUES ('morning', '2026-10-31', 'taybah-dev-fixture:item-1', 1, NULL, 100);`,
    );
    executor.exec(
      `INSERT INTO azkar_reminders (id, target_type, target_key, enabled, trigger_type, clock_time, prayer, offset_minutes, notification_ids, updated_at) VALUES ('r1', 'category', 'morning', 1, 'clock', '07:00', NULL, NULL, NULL, 100);`,
    );

    clearLocalUserData(executor);

    for (const table of ['azkar_favorites', 'azkar_progress', 'azkar_reminders']) {
      expect(database.prepare(`SELECT count(*) as c FROM ${table}`).get()).toEqual({ c: 0 });
    }

    database.close();
  });

  it('deletes rows from existing user tables and gracefully ignores missing tables', () => {
    const { database, executor } = openMigrated();

    executor.exec(
      `INSERT INTO bookmarks (id, verse_id, kind, client_updated_at, dirty) VALUES ('b1', 1, 'verse', 100, 0);`,
    );
    executor.exec(
      `INSERT INTO highlights (id, verse_id, color, client_updated_at, dirty) VALUES ('h1', 1, 'gold', 100, 0);`,
    );
    executor.exec(
      `INSERT INTO notes (id, verse_id, body, client_updated_at, dirty) VALUES ('n1', 1, 'my note', 100, 0);`,
    );
    executor.exec(
      `INSERT INTO recent_listens (audio_file_id, reciter_resource_id, chapter_id, last_position_ms, played_at) VALUES (1, 10, 1, 5000, 100);`,
    );

    const countBookmarksBefore = database.prepare(`SELECT count(*) as c FROM bookmarks`).get() as { c: number };
    expect(countBookmarksBefore.c).toBe(1);

    storage.set(storageKeys.searchRecentQueries, JSON.stringify(['سورة البقرة']));
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    storage.set(storageKeys.readerLastPage, 42);
    storage.set(storageKeys.audioLastPosition, 12345);
    storage.set(storageKeys.azkar.recentScopes, JSON.stringify([{ openedAt: 1, scopeKey: 'category:morning' }]));
    storage.set(storageKeys.sibha.state, JSON.stringify({ count: 3, label: '', target: 33 }));
    storage.set(storageKeys.sibha.today, JSON.stringify({ date: '2026-11-01', total: 3 }));
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: 100, sessions: [], wird: true }));

    clearLocalUserData(executor);

    const countBookmarks = database.prepare(`SELECT count(*) as c FROM bookmarks`).get() as { c: number };
    const countHighlights = database.prepare(`SELECT count(*) as c FROM highlights`).get() as { c: number };
    const countNotes = database.prepare(`SELECT count(*) as c FROM notes`).get() as { c: number };
    const countRecents = database.prepare(`SELECT count(*) as c FROM recent_listens`).get() as { c: number };

    expect(countBookmarks.c).toBe(0);
    expect(countHighlights.c).toBe(0);
    expect(countNotes.c).toBe(0);
    expect(countRecents.c).toBe(0);

    expect(storage.contains(storageKeys.searchRecentQueries)).toBe(false);
    expect(storage.contains(storageKeys.readerLastVerseKey)).toBe(false);
    expect(storage.contains(storageKeys.readerLastPage)).toBe(false);
    expect(storage.contains(storageKeys.audioLastPosition)).toBe(false);
    expect(storage.contains(storageKeys.azkar.recentScopes)).toBe(false);
    expect(storage.contains(storageKeys.sibha.state)).toBe(false);
    expect(storage.contains(storageKeys.sibha.today)).toBe(false);
    expect(storage.contains(storageKeys.dailyGoals)).toBe(false);

    database.close();
  });
});
