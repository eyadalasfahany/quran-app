import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { USER_DATABASE } from './constants';
import { configureUserDatabase } from './pragmas';

const migrationsDir = join(process.cwd(), 'src/core/db/user/migrations');

function openMigrated(path = ':memory:'): { database: DatabaseSync; executor: SqlExecutor } {
  const opened = openNodeSqlite(path);
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, migrationsDir);
  return opened;
}

function tableNames(database: DatabaseSync): string[] {
  return (
    database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all() as { name: string }[]
  ).map((row) => row.name);
}

function indexSql(database: DatabaseSync, name: string): string {
  const row = database.prepare(`SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?`).get(name) as
    | { sql: string }
    | undefined;
  if (row === undefined) {
    throw new Error(`Missing index ${name}.`);
  }
  return row.sql;
}

describe('user.db schema', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = openMigrated().database;
  });

  afterEach(() => {
    database.close();
  });

  it('creates the personal tables and no content tables', () => {
    expect(tableNames(database)).toEqual([
      'azkar_favorites',
      'azkar_progress',
      'azkar_reminders',
      'bookmarks',
      'downloads',
      'dua_favorites',
      'highlights',
      'khatma_logs',
      'khatma_plans',
      'my_duas',
      'names_favorites',
      'notes',
      'outbox',
      'recent_listens',
      'sync_meta',
    ]);
    expect(USER_DATABASE).toBe('user.db');
  });

  it('creates the three azkar personal tables with their keys', () => {
    const columns = (table: string): string[] =>
      (database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name);

    expect(columns('azkar_favorites')).toEqual(['entry_key', 'created_at']);
    expect(columns('azkar_progress')).toEqual([
      'scope_key',
      'period_key',
      'item_key',
      'current_count',
      'completed_at',
      'updated_at',
    ]);
    expect(columns('azkar_reminders')).toEqual([
      'id',
      'target_type',
      'target_key',
      'enabled',
      'trigger_type',
      'clock_time',
      'prayer',
      'offset_minutes',
      'notification_ids',
      'updated_at',
    ]);
    expect(indexSql(database, 'azkar_progress_scope_period_idx')).toContain('scope_key');
    expect(indexSql(database, 'azkar_reminders_target_idx')).toContain('UNIQUE');

    database.prepare(
      `INSERT INTO azkar_reminders (id, target_type, target_key, enabled, trigger_type, clock_time, prayer, offset_minutes, notification_ids, updated_at)
       VALUES ('r1', 'category', 'morning', 1, 'clock', '07:00', NULL, NULL, NULL, 1)`,
    ).run();
    expect(() => {
      database.prepare(
        `INSERT INTO azkar_reminders (id, target_type, target_key, enabled, trigger_type, clock_time, prayer, offset_minutes, notification_ids, updated_at)
         VALUES ('r2', 'category', 'morning', 1, 'clock', '08:00', NULL, NULL, NULL, 1)`,
      ).run();
    }).toThrow(/unique/i);
  });

  it('indexes verse_id and keeps one live highlight and one live bookmark per kind', () => {
    expect(indexSql(database, 'bookmarks_verse_id_idx')).toContain('verse_id');
    expect(indexSql(database, 'highlights_verse_id_idx')).toContain('verse_id');
    expect(indexSql(database, 'notes_verse_id_idx')).toContain('verse_id');

    const liveBookmarks = indexSql(database, 'bookmarks_live_kind_verse_idx');
    expect(liveBookmarks).toContain('UNIQUE');
    expect(liveBookmarks.toLowerCase()).toContain('deleted_at');
    expect(liveBookmarks).toContain('kind');

    const liveHighlights = indexSql(database, 'highlights_live_verse_idx');
    expect(liveHighlights).toContain('UNIQUE');
    expect(liveHighlights.toLowerCase()).toContain('deleted_at');

    database.prepare(
      `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
       VALUES ('verse', 1, 'verse', NULL, 1, NULL, 1)`,
    ).run();
    database.prepare(
      `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
       VALUES ('page', 1, 'page', 1, 1, NULL, 1)`,
    ).run();
    expect(() => {
      database.prepare(
        `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
         VALUES ('verse-2', 1, 'verse', NULL, 2, NULL, 1)`,
      ).run();
    }).toThrow(/unique/i);

    database.prepare(
      `INSERT INTO highlights (id, verse_id, color, client_updated_at, deleted_at, dirty)
       VALUES ('gold', 1, 'gold', 1, NULL, 1)`,
    ).run();
    expect(() => {
      database.prepare(
        `INSERT INTO highlights (id, verse_id, color, client_updated_at, deleted_at, dirty)
         VALUES ('blue', 1, 'blue', 2, NULL, 1)`,
      ).run();
    }).toThrow(/unique/i);

    database.prepare(`UPDATE highlights SET deleted_at = 3 WHERE id = 'gold'`).run();
    database.prepare(
      `INSERT INTO highlights (id, verse_id, color, client_updated_at, deleted_at, dirty)
       VALUES ('blue', 1, 'blue', 4, NULL, 1)`,
    ).run();
  });

  it('rejects an empty note body and a body over 10,000 characters', () => {
    const insert = database.prepare(
      `INSERT INTO notes (id, verse_id, body, client_updated_at, deleted_at, dirty) VALUES (?, 1, ?, 1, NULL, 1)`,
    );
    expect(() => insert.run('empty', '')).toThrow(/check/i);
    expect(() => insert.run('long', 'ا'.repeat(10_001))).toThrow(/check/i);
    insert.run('ok', 'ا'.repeat(10_000));
  });

  it('opens user.db in WAL mode beside content.db', () => {
    const source = readFileSync(join(process.cwd(), 'src/core/db/user/open.ts'), 'utf8');
    expect(source).toContain('USER_DATABASE');
    expect(source).toContain('configureUserDatabase');
    expect(source).not.toContain('content.db');

    const directory = mkdtempSync(join(tmpdir(), 'user-db-wal-'));
    const path = join(directory, USER_DATABASE);
    const opened = openMigrated(path);
    try {
      const journal = opened.executor.get<{ journal_mode: string }>('PRAGMA journal_mode');
      const foreignKeys = opened.executor.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
      expect(journal?.journal_mode).toBe('wal');
      expect(foreignKeys?.foreign_keys).toBe(1);
    } finally {
      opened.database.close();
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('keeps bookmarks when content.db is deleted', () => {
    const directory = mkdtempSync(join(tmpdir(), 'user-db-separate-'));
    const userPath = join(directory, USER_DATABASE);
    const contentPath = join(directory, 'content.db');
    const content = new DatabaseSync(contentPath);
    content.exec('CREATE TABLE verses (id integer primary key, text_uthmani text not null)');
    content.prepare(`INSERT INTO verses (id, text_uthmani) VALUES (1, 'FIXTURE text 1 — not a dhikr')`).run();
    content.close();

    const user = openMigrated(userPath);
    user.executor.run(
      `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
       VALUES ('kept', 262, 'verse', NULL, 1, NULL, 1)`,
    );
    user.database.close();

    rmSync(contentPath);

    const reopened = new DatabaseSync(userPath);
    try {
      expect(existsSync(contentPath)).toBe(false);
      expect(existsSync(userPath)).toBe(true);
      expect(userPath).not.toBe(contentPath);
      const bookmark = reopened.prepare(`SELECT id, verse_id FROM bookmarks WHERE deleted_at IS NULL`).get() as {
        id: string;
        verse_id: number;
      };
      expect(bookmark).toEqual({ id: 'kept', verse_id: 262 });
      expect(tableNames(reopened)).not.toContain('verses');
    } finally {
      reopened.close();
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('adds recent_listens in migration 0001 and keeps the rows that exist before it', () => {
    const { database: old, executor } = openNodeSqlite(':memory:');
    try {
      configureUserDatabase(executor);
      executor.exec(readFileSync(join(migrationsDir, '0000_user_data.sql'), 'utf8'));
      executor.run(
        `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
         VALUES ('kept', 262, 'verse', NULL, 1, NULL, 1)`,
      );

      executor.exec(readFileSync(join(migrationsDir, '0001_recent_listens.sql'), 'utf8'));

      expect(tableNames(old)).toContain('recent_listens');
      expect(old.prepare('SELECT id FROM bookmarks').all()).toEqual([{ id: 'kept' }]);
      expect(old.prepare('SELECT COUNT(*) AS count FROM outbox').get()).toEqual({ count: 0 });
    } finally {
      old.close();
    }
  });

  it('registers migration 0001 in the journal after 0000', () => {
    const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta/_journal.json'), 'utf8')) as {
      entries: { idx: number; tag: string }[];
    };
    expect(journal.entries.map((entry) => entry.tag)).toEqual([
      '0000_user_data',
      '0001_recent_listens',
      '0002_audio_downloads',
      '0003_volatile_madrox',
      '0004_unknown_nitro',
      '0005_my_duas',
    ]);
    expect(readFileSync(join(migrationsDir, '0001_recent_listens.sql'), 'utf8')).toMatch(/^CREATE TABLE `recent_listens`/);
    expect(readFileSync(join(migrationsDir, 'migrations.js'), 'utf8')).toContain('m0001');
    expect(readFileSync(join(migrationsDir, 'migrations.js'), 'utf8')).toContain('m0002');
    expect(readFileSync(join(migrationsDir, 'migrations.js'), 'utf8')).toContain('m0003');
    expect(readFileSync(join(migrationsDir, 'migrations.js'), 'utf8')).toContain('m0005');
  });

  it('adds khatma tables in migration 0003 with one live active plan per user', () => {
    const { database: old, executor } = openNodeSqlite(':memory:');
    try {
      configureUserDatabase(executor);
      for (const tag of ['0000_user_data', '0001_recent_listens', '0002_audio_downloads']) {
        executor.exec(readFileSync(join(migrationsDir, `${tag}.sql`), 'utf8'));
      }
      executor.run(
        `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
         VALUES ('kept', 262, 'verse', NULL, 1, NULL, 1)`,
      );

      executor.exec(readFileSync(join(migrationsDir, '0003_volatile_madrox.sql'), 'utf8'));

      expect(tableNames(old)).toContain('khatma_plans');
      expect(tableNames(old)).toContain('khatma_logs');
      expect(old.prepare('SELECT id FROM bookmarks').all()).toEqual([{ id: 'kept' }]);

      const oneActive = indexSql(old, 'khatma_plans_one_active_idx');
      expect(oneActive).toContain('UNIQUE');
      expect(oneActive).toContain('active');
      expect(oneActive.toLowerCase()).toContain('deleted_at');

      const oneLogPerDay = indexSql(old, 'khatma_logs_live_plan_date_idx');
      expect(oneLogPerDay).toContain('UNIQUE');
      expect(oneLogPerDay).toContain('plan_id');
      expect(oneLogPerDay).toContain('date');

      executor.run(
        `INSERT INTO khatma_plans (id, duration_days, start_verse_id, start_date, status, completed_at, client_updated_at, deleted_at, dirty)
         VALUES ('plan-1', 30, 1, '2026-10-30', 'active', NULL, 1, NULL, 1)`,
      );
      expect(() =>
        executor.run(
          `INSERT INTO khatma_plans (id, duration_days, start_verse_id, start_date, status, completed_at, client_updated_at, deleted_at, dirty)
           VALUES ('plan-2', 60, 1, '2026-10-30', 'active', NULL, 2, NULL, 1)`,
        ),
      ).toThrow(/unique/i);
      // An abandoned plan and a soft-deleted active one leave room for a new active plan.
      executor.run(`UPDATE khatma_plans SET status = 'abandoned', completed_at = 3 WHERE id = 'plan-1'`);
      executor.run(
        `INSERT INTO khatma_plans (id, duration_days, start_verse_id, start_date, status, completed_at, client_updated_at, deleted_at, dirty)
         VALUES ('plan-3', 60, 1, '2026-10-30', 'active', NULL, 4, NULL, 1)`,
      );
    } finally {
      old.close();
    }
  });

  it('adds downloads in migration 0002, keeps existing rows, and defaults progress to 0', () => {
    const { database: old, executor } = openNodeSqlite(':memory:');
    try {
      configureUserDatabase(executor);
      executor.exec(readFileSync(join(migrationsDir, '0000_user_data.sql'), 'utf8'));
      executor.exec(readFileSync(join(migrationsDir, '0001_recent_listens.sql'), 'utf8'));
      executor.run(
        `INSERT INTO recent_listens (audio_file_id, reciter_resource_id, chapter_id, last_position_ms, played_at)
         VALUES (100, 30, 1, 1000, 1)`,
      );

      executor.exec(readFileSync(join(migrationsDir, '0002_audio_downloads.sql'), 'utf8'));

      expect(tableNames(old)).toContain('downloads');
      expect(old.prepare('SELECT audio_file_id AS id FROM recent_listens').all()).toEqual([{ id: 100 }]);
      executor.run(
        `INSERT INTO downloads (audio_file_id, reciter_resource_id, chapter_id, audio_url, local_path, status, downloaded_at, verified_at)
         VALUES (100, 30, 1, 'https://example.test/1.mp3', 'file:///a.mp3', 'queued', NULL, NULL)`,
      );
      expect(old.prepare('SELECT progress, resume_data, size_bytes FROM downloads').get()).toEqual({
        progress: 0,
        resume_data: null,
        size_bytes: null,
      });
      expect(indexSql(old, 'downloads_reciter_resource_id_idx')).toContain('reciter_resource_id');
    } finally {
      old.close();
    }
  });
});
