import { randomUUID } from 'expo-crypto';

import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

import {
  type KhatmaLog,
  type KhatmaPlan,
  KhatmaValidationError,
  isKhatmaPlanStatus,
} from './model';
import { toLocalDateString } from './plan';

export type UserStore = {
  db?: SqlExecutor;
  now?: () => number;
  uuid?: () => string;
};

type ResolvedStore = {
  db: SqlExecutor;
  now: () => number;
  uuid: () => string;
};

type OutboxOp = 'upsert' | 'delete';

type PlanRow = {
  id: string;
  durationDays: number;
  startVerseId: number;
  startDate: string;
  status: string;
  completedAt: number | null;
  clientUpdatedAt: number;
};

type LogRow = {
  id: string;
  planId: string;
  date: string;
  pagesRead: number;
  lastVerseId: number;
  clientUpdatedAt: number;
};

const PLAN_SELECT = `
  SELECT
    id,
    duration_days AS durationDays,
    start_verse_id AS startVerseId,
    start_date AS startDate,
    status,
    completed_at AS completedAt,
    client_updated_at AS clientUpdatedAt
  FROM khatma_plans
`;

const LOG_SELECT = `
  SELECT
    id,
    plan_id AS planId,
    date,
    pages_read AS pagesRead,
    last_verse_id AS lastVerseId,
    client_updated_at AS clientUpdatedAt
  FROM khatma_logs
`;

export function createPlan(
  input: { durationDays: number; startVerseId: number },
  store?: UserStore,
): KhatmaPlan {
  if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
    throw new KhatmaValidationError('duration_invalid');
  }

  const { db, now, uuid } = resolveStore(store);

  return db.transaction(() => {
    const clientUpdatedAt = now();
    const startDate = toLocalDateString(new Date(clientUpdatedAt));
    const active = db.get<PlanRow>(`${PLAN_SELECT} WHERE status = 'active' AND deleted_at IS NULL LIMIT 1`);

    if (active !== undefined) {
      abandonPlanRow(db, active, clientUpdatedAt);
    }

    const id = uuid();
    db.run(
      `INSERT INTO khatma_plans (
         id, duration_days, start_verse_id, start_date, status, completed_at,
         client_updated_at, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, 'active', NULL, ?, NULL, 1)`,
      [id, input.durationDays, input.startVerseId, startDate, clientUpdatedAt],
    );

    const plan: KhatmaPlan = {
      id,
      durationDays: input.durationDays,
      startVerseId: input.startVerseId,
      startDate,
      status: 'active',
      completedAt: null,
      clientUpdatedAt,
    };

    writeOutbox(db, {
      entity: 'khatma_plan',
      entityId: id,
      op: 'upsert',
      payload: JSON.stringify(planPayload(plan, clientUpdatedAt)),
      clientUpdatedAt,
    });

    return plan;
  });
}

export function logPagesRead(
  planId: string,
  input: { date: string; pagesRead: number; lastVerseId: number },
  store?: UserStore,
): KhatmaLog {
  if (!Number.isInteger(input.pagesRead) || input.pagesRead <= 0) {
    throw new KhatmaValidationError('pages_read_invalid');
  }

  const { db, now, uuid } = resolveStore(store);

  return db.transaction(() => {
    const clientUpdatedAt = now();
    const live = db.get<LogRow>(
      `${LOG_SELECT} WHERE plan_id = ? AND date = ? AND deleted_at IS NULL`,
      [planId, input.date],
    );

    if (live !== undefined) {
      const pagesRead = Math.max(live.pagesRead, input.pagesRead);
      const lastVerseId = Math.max(live.lastVerseId, input.lastVerseId);

      db.run(
        `UPDATE khatma_logs
         SET pages_read = ?, last_verse_id = ?, client_updated_at = ?, dirty = 1
         WHERE id = ?`,
        [pagesRead, lastVerseId, clientUpdatedAt, live.id],
      );

      const log: KhatmaLog = {
        id: live.id,
        planId,
        date: input.date,
        pagesRead,
        lastVerseId,
        clientUpdatedAt,
      };

      writeOutbox(db, {
        entity: 'khatma_log',
        entityId: live.id,
        op: 'upsert',
        payload: JSON.stringify(logPayload(log, clientUpdatedAt)),
        clientUpdatedAt,
      });

      return log;
    }

    const id = uuid();
    db.run(
      `INSERT INTO khatma_logs (
         id, plan_id, date, pages_read, last_verse_id, client_updated_at, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, 1)`,
      [id, planId, input.date, input.pagesRead, input.lastVerseId, clientUpdatedAt],
    );

    const log: KhatmaLog = {
      id,
      planId,
      date: input.date,
      pagesRead: input.pagesRead,
      lastVerseId: input.lastVerseId,
      clientUpdatedAt,
    };

    writeOutbox(db, {
      entity: 'khatma_log',
      entityId: id,
      op: 'upsert',
      payload: JSON.stringify(logPayload(log, clientUpdatedAt)),
      clientUpdatedAt,
    });

    return log;
  });
}

export function endPlan(planId: string, status: 'completed' | 'abandoned', store?: UserStore): KhatmaPlan | null {
  if (status !== 'completed' && status !== 'abandoned') {
    throw new KhatmaValidationError('plan_status_invalid');
  }

  const { db, now } = resolveStore(store);

  return db.transaction(() => {
    const live = db.get<PlanRow>(`${PLAN_SELECT} WHERE id = ? AND deleted_at IS NULL`, [planId]);
    if (live === undefined) {
      return null;
    }

    const clientUpdatedAt = now();
    const completedAt = clientUpdatedAt;

    db.run(
      `UPDATE khatma_plans
       SET status = ?, completed_at = ?, client_updated_at = ?, dirty = 1
       WHERE id = ?`,
      [status, completedAt, clientUpdatedAt, planId],
    );

    const plan = asPlan({ ...live, status, completedAt, clientUpdatedAt });

    writeOutbox(db, {
      entity: 'khatma_plan',
      entityId: planId,
      op: 'upsert',
      payload: JSON.stringify(planPayload(plan, clientUpdatedAt)),
      clientUpdatedAt,
    });

    return plan;
  });
}

export function getActivePlan(store?: UserStore): KhatmaPlan | null {
  const { db } = resolveStore(store);
  const row = db.get<PlanRow>(`${PLAN_SELECT} WHERE status = 'active' AND deleted_at IS NULL LIMIT 1`);
  return row === undefined ? null : asPlan(row);
}

export function listLogsForPlan(planId: string, store?: UserStore): KhatmaLog[] {
  const { db } = resolveStore(store);
  return db
    .all<LogRow>(`${LOG_SELECT} WHERE plan_id = ? AND deleted_at IS NULL ORDER BY date ASC, id ASC`, [planId])
    .map(asLog);
}

/** Furthest live log verse for the plan; the khatma position marker is derived from logs, not stored separately. */
export function getKhatmaMarkerVerseId(planId: string, store?: UserStore): number | null {
  const { db } = resolveStore(store);
  const row = db.get<{ markerVerseId: number | null }>(
    `SELECT max(last_verse_id) AS markerVerseId
     FROM khatma_logs
     WHERE plan_id = ? AND deleted_at IS NULL`,
    [planId],
  );
  return row?.markerVerseId ?? null;
}

/**
 * Called when the reader marks an ayah as the khatma position («علّمها كموضع الختمة»).
 * The marker is the furthest `last_verse_id` across live logs; each move derives today's log from page delta.
 * Idempotent; backward moves are ignored (history never shrinks). Caller resolves `page` / plan bounds from content.db.
 * SqlExecutor does not nest transactions, so reads run first then logPagesRead / endPlan commit separately.
 */
export function updateKhatmaPosition(
  input: {
    page: number;
    verseId: number;
    startPage: number;
    pagesTotal: number;
  },
  store?: UserStore,
): { logged: boolean; completed: boolean } {
  const { now } = resolveStore(store);

  const plan = getActivePlan(store);
  if (plan === null) {
    return { logged: false, completed: false };
  }

  const pagesReadTotal = Math.max(0, input.page - input.startPage + 1);
  if (pagesReadTotal === 0) {
    return { logged: false, completed: false };
  }

  const logs = listLogsForPlan(plan.id, store);
  const today = toLocalDateString(new Date(now()));
  const todayLog = logs.find((log) => log.date === today);
  const pagesLoggedBeforeToday =
    logs.reduce((sum, log) => sum + log.pagesRead, 0) - (todayLog?.pagesRead ?? 0);
  const todayPages = pagesReadTotal - pagesLoggedBeforeToday;

  let logged = false;
  const priorTodayPages = todayLog?.pagesRead ?? 0;
  if (todayPages > priorTodayPages) {
    logPagesRead(plan.id, { date: today, pagesRead: todayPages, lastVerseId: input.verseId }, store);
    logged = true;
  }

  let completed = false;
  if (pagesReadTotal >= input.pagesTotal) {
    const stillActive = getActivePlan(store);
    if (stillActive?.id === plan.id) {
      endPlan(plan.id, 'completed', store);
      completed = true;
    }
  }

  return { logged, completed };
}

function resolveStore(store?: UserStore): ResolvedStore {
  return {
    db: store?.db ?? defaultExecutor(),
    now: store?.now ?? Date.now,
    uuid: store?.uuid ?? randomUUID,
  };
}

function defaultExecutor(): SqlExecutor {
  return openUserDb().executor;
}

function abandonPlanRow(db: SqlExecutor, plan: PlanRow, clientUpdatedAt: number): void {
  db.run(
    `UPDATE khatma_plans
     SET status = 'abandoned', completed_at = ?, client_updated_at = ?, dirty = 1
     WHERE id = ?`,
    [clientUpdatedAt, clientUpdatedAt, plan.id],
  );

  const abandoned = asPlan({
    ...plan,
    status: 'abandoned',
    completedAt: clientUpdatedAt,
    clientUpdatedAt,
  });

  writeOutbox(db, {
    entity: 'khatma_plan',
    entityId: plan.id,
    op: 'upsert',
    payload: JSON.stringify(planPayload(abandoned, clientUpdatedAt)),
    clientUpdatedAt,
  });
}

function writeOutbox(
  db: SqlExecutor,
  change: { entity: string; entityId: string; op: OutboxOp; payload: string; clientUpdatedAt: number },
): void {
  db.run(
    `INSERT INTO outbox (entity, entity_id, op, payload, client_updated_at, attempts)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(entity, entity_id) DO UPDATE SET
       op = excluded.op,
       payload = excluded.payload,
       client_updated_at = excluded.client_updated_at,
       attempts = 0`,
    [change.entity, change.entityId, change.op, change.payload, change.clientUpdatedAt],
  );
}

function planPayload(plan: KhatmaPlan, clientUpdatedAt: number) {
  return {
    id: plan.id,
    duration_days: plan.durationDays,
    start_verse_id: plan.startVerseId,
    start_date: plan.startDate,
    status: plan.status,
    completed_at: plan.completedAt,
    client_updated_at: clientUpdatedAt,
  };
}

function logPayload(log: KhatmaLog, clientUpdatedAt: number) {
  return {
    id: log.id,
    plan_id: log.planId,
    date: log.date,
    pages_read: log.pagesRead,
    last_verse_id: log.lastVerseId,
    client_updated_at: clientUpdatedAt,
  };
}

function asPlan(row: PlanRow): KhatmaPlan {
  if (!isKhatmaPlanStatus(row.status)) {
    throw new Error(`Unknown khatma plan status "${row.status}".`);
  }

  return {
    id: row.id,
    durationDays: row.durationDays,
    startVerseId: row.startVerseId,
    startDate: row.startDate,
    status: row.status,
    completedAt: row.completedAt,
    clientUpdatedAt: row.clientUpdatedAt,
  };
}

function asLog(row: LogRow): KhatmaLog {
  return { ...row };
}
