import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { configureUserDatabase } from '@/core/db/user/pragmas';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { KhatmaValidationError } from './model';
import {
  createPlan,
  endPlan,
  getActivePlan,
  getKhatmaMarkerVerseId,
  listLogsForPlan,
  logPagesRead,
  updateKhatmaPosition,
} from './repository';

jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

const migrationsDir = join(process.cwd(), 'src/core/db/user/migrations');

type OutboxRow = {
  seq: number;
  entity: string;
  entity_id: string;
  op: string;
  payload: string;
  client_updated_at: number;
  attempts: number;
};

function openUser(): { database: DatabaseSync; executor: SqlExecutor } {
  const opened = openNodeSqlite(':memory:');
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, migrationsDir);
  return opened;
}

function outbox(database: DatabaseSync): OutboxRow[] {
  return database
    .prepare(
      `SELECT seq, entity, entity_id, op, payload, client_updated_at, attempts
       FROM outbox ORDER BY seq`,
    )
    .all() as OutboxRow[];
}

function activePlanCount(database: DatabaseSync): number {
  const row = database
    .prepare(`SELECT count(*) AS count FROM khatma_plans WHERE status = 'active' AND deleted_at IS NULL`)
    .get() as { count: number };
  return row.count;
}

function localMs(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

function outboxCount(database: DatabaseSync): number {
  const row = database.prepare(`SELECT count(*) AS count FROM outbox`).get() as { count: number };
  return row.count;
}

describe('khatma repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openUser();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('rejects invalid duration and pages read', () => {
    expect(() => createPlan({ durationDays: 0, startVerseId: 1 }, { db: executor })).toThrow(KhatmaValidationError);
    expect(() => logPagesRead('plan-1', { date: '2026-01-01', pagesRead: 0, lastVerseId: 1 }, { db: executor })).toThrow(
      KhatmaValidationError,
    );
  });

  it('createPlan abandons a previous active plan and writes outbox rows', () => {
    const first = createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => 100, uuid: () => 'plan-1' });
    expect(first.status).toBe('active');
    expect(getActivePlan({ db: executor })?.id).toBe('plan-1');

    const second = createPlan({ durationDays: 7, startVerseId: 50 }, { db: executor, now: () => 200, uuid: () => 'plan-2' });
    expect(second.id).toBe('plan-2');
    expect(activePlanCount(database)).toBe(1);

    const firstRow = database.prepare(`SELECT status, completed_at, dirty FROM khatma_plans WHERE id = 'plan-1'`).get() as {
      status: string;
      completed_at: number | null;
      dirty: number;
    };
    expect(firstRow).toEqual({ status: 'abandoned', completed_at: 200, dirty: 1 });

    const rows = outbox(database);
    expect(rows.some((row) => row.entity === 'khatma_plan' && row.entity_id === 'plan-1')).toBe(true);
    expect(rows.some((row) => row.entity === 'khatma_plan' && row.entity_id === 'plan-2')).toBe(true);
  });

  it('logPagesRead inserts and merges same-day logs by larger pages and further verse', () => {
    createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => 100, uuid: () => 'plan-1' });

    const created = logPagesRead(
      'plan-1',
      { date: '2026-01-01', pagesRead: 10, lastVerseId: 100 },
      { db: executor, now: () => 110, uuid: () => 'log-1' },
    );
    expect(created).toEqual({
      id: 'log-1',
      planId: 'plan-1',
      date: '2026-01-01',
      pagesRead: 10,
      lastVerseId: 100,
      clientUpdatedAt: 110,
    });

    const merged = logPagesRead(
      'plan-1',
      { date: '2026-01-01', pagesRead: 8, lastVerseId: 200 },
      { db: executor, now: () => 120 },
    );
    expect(merged).toEqual({
      id: 'log-1',
      planId: 'plan-1',
      date: '2026-01-01',
      pagesRead: 10,
      lastVerseId: 200,
      clientUpdatedAt: 120,
    });

    expect(listLogsForPlan('plan-1', { db: executor })).toEqual([merged]);
    expect(outbox(database).some((row) => row.entity === 'khatma_log' && row.entity_id === 'log-1')).toBe(true);
  });

  it('endPlan sets status and completed_at', () => {
    createPlan({ durationDays: 15, startVerseId: 1 }, { db: executor, now: () => 100, uuid: () => 'plan-1' });
    const ended = endPlan('plan-1', 'completed', { db: executor, now: () => 300 });
    expect(ended).toMatchObject({ id: 'plan-1', status: 'completed', completedAt: 300, clientUpdatedAt: 300 });
    expect(getActivePlan({ db: executor })).toBeNull();
  });

  describe('updateKhatmaPosition', () => {
    const positionBase = { startPage: 1, pagesTotal: 604, verseId: 500 };

    it('does nothing when there is no active plan', () => {
      const result = updateKhatmaPosition(
        { ...positionBase, page: 10 },
        { db: executor, now: () => localMs(2026, 1, 1) },
      );
      expect(result).toEqual({ logged: false, completed: false });
      expect(outboxCount(database)).toBe(0);
    });

    it('does nothing when the position is behind the plan start page', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const result = updateKhatmaPosition(
        { page: 5, verseId: 50, startPage: 10, pagesTotal: 595 },
        { db: executor, now: () => localMs(2026, 1, 1) },
      );
      expect(result).toEqual({ logged: false, completed: false });
      expect(listLogsForPlan('plan-1', { db: executor })).toEqual([]);
    });

    it('inserts today log on the first position update of the day', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      const result = updateKhatmaPosition({ ...positionBase, page: 10 }, store);
      expect(result).toEqual({ logged: true, completed: false });
      expect(listLogsForPlan('plan-1', store)).toEqual([
        {
          id: 'log-1',
          planId: 'plan-1',
          date: '2026-01-01',
          pagesRead: 10,
          lastVerseId: 500,
          clientUpdatedAt: localMs(2026, 1, 1),
        },
      ]);
      expect(outbox(database).some((row) => row.entity === 'khatma_log')).toBe(true);
    });

    it('grows today log when the marker advances further the same day', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      updateKhatmaPosition({ ...positionBase, page: 10 }, store);
      updateKhatmaPosition({ ...positionBase, page: 20, verseId: 600 }, { db: executor, now: () => localMs(2026, 1, 1, 18) });
      const logs = listLogsForPlan('plan-1', { db: executor });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ date: '2026-01-01', pagesRead: 20, lastVerseId: 600 });
    });

    it('does not write when the marker is unmoved or moved backward the same day', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      updateKhatmaPosition({ ...positionBase, page: 20 }, store);
      const before = outboxCount(database);
      expect(updateKhatmaPosition({ ...positionBase, page: 20 }, store)).toEqual({
        logged: false,
        completed: false,
      });
      expect(updateKhatmaPosition({ ...positionBase, page: 15, verseId: 100 }, store)).toEqual({
        logged: false,
        completed: false,
      });
      expect(outboxCount(database)).toBe(before);
    });

    it('opens a new log row after midnight and leaves yesterday untouched', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      updateKhatmaPosition({ ...positionBase, page: 10 }, {
        db: executor,
        now: () => localMs(2026, 1, 1),
        uuid: () => 'log-day-1',
      });
      updateKhatmaPosition({ ...positionBase, page: 15 }, {
        db: executor,
        now: () => localMs(2026, 1, 2),
        uuid: () => 'log-day-2',
      });
      expect(listLogsForPlan('plan-1', { db: executor })).toEqual([
        expect.objectContaining({ date: '2026-01-01', pagesRead: 10 }),
        expect.objectContaining({ date: '2026-01-02', pagesRead: 5 }),
      ]);
    });

    it('completes the plan at the final page and ignores later updates', () => {
      createPlan({ durationDays: 7, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      const done = updateKhatmaPosition({ ...positionBase, page: 604, pagesTotal: 604 }, store);
      expect(done).toEqual({ logged: true, completed: true });
      expect(getActivePlan(store)).toBeNull();
      const planRow = database.prepare(`SELECT status, completed_at FROM khatma_plans WHERE id = 'plan-1'`).get() as {
        status: string;
        completed_at: number | null;
      };
      expect(planRow.status).toBe('completed');
      expect(planRow.completed_at).toBe(localMs(2026, 1, 1));

      const again = updateKhatmaPosition({ ...positionBase, page: 604, pagesTotal: 604 }, store);
      expect(again).toEqual({ logged: false, completed: false });
    });

    it('attributes cross-day progress to today only', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      logPagesRead(
        'plan-1',
        { date: '2026-01-01', pagesRead: 20, lastVerseId: 100 },
        { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-day-1' },
      );
      updateKhatmaPosition({ ...positionBase, page: 45 }, {
        db: executor,
        now: () => localMs(2026, 1, 2),
        uuid: () => 'log-day-2',
      });
      expect(listLogsForPlan('plan-1', { db: executor })).toEqual([
        expect.objectContaining({ date: '2026-01-01', pagesRead: 20 }),
        expect.objectContaining({ date: '2026-01-02', pagesRead: 25 }),
      ]);
    });
  });

  describe('getKhatmaMarkerVerseId', () => {
    it('returns null when the plan has no logs', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      expect(getKhatmaMarkerVerseId('plan-1', { db: executor })).toBeNull();
    });

    it('returns the furthest last_verse_id after position updates', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      updateKhatmaPosition({ startPage: 1, pagesTotal: 604, page: 10, verseId: 500 }, store);
      updateKhatmaPosition({ startPage: 1, pagesTotal: 604, page: 20, verseId: 800 }, store);
      expect(getKhatmaMarkerVerseId('plan-1', store)).toBe(800);
    });

    it('keeps the furthest verse when a backward move does not write', () => {
      createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'plan-1' });
      const store = { db: executor, now: () => localMs(2026, 1, 1), uuid: () => 'log-1' };
      updateKhatmaPosition({ startPage: 1, pagesTotal: 604, page: 20, verseId: 800 }, store);
      updateKhatmaPosition({ startPage: 1, pagesTotal: 604, page: 15, verseId: 100 }, store);
      expect(getKhatmaMarkerVerseId('plan-1', store)).toBe(800);
    });
  });

  it('partial unique index prevents two live active plans', () => {
    createPlan({ durationDays: 30, startVerseId: 1 }, { db: executor, now: () => 100, uuid: () => 'plan-1' });

    expect(() => {
      database
        .prepare(
          `INSERT INTO khatma_plans (
             id, duration_days, start_verse_id, start_date, status, completed_at,
             client_updated_at, deleted_at, dirty
           ) VALUES ('plan-2', 7, 1, '2026-01-01', 'active', NULL, 200, NULL, 1)`,
        )
        .run();
    }).toThrow();
  });
});
