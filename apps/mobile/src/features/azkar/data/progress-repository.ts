import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

import type { AzkarProgressRow } from './model';
import {
  applyTap,
  emptyTapState,
  SESSION_UNIT_KEY,
  pickLastActiveScope,
  type ScopeResolution,
  type ScopeSummary,
  type TapResult,
} from './progress';

/** Injectable for tests: `db` defaults to the device's user.db, `now` to the wall clock. */
export type AzkarStore = {
  db?: SqlExecutor;
  now?: () => number;
};

const PROGRESS_SELECT = `
  SELECT
    scope_key AS scopeKey,
    period_key AS periodKey,
    item_key AS itemKey,
    current_count AS currentCount,
    completed_at AS completedAt,
    updated_at AS updatedAt
  FROM azkar_progress
`;

function resolveStore(store?: AzkarStore): { db: SqlExecutor; now: () => number } {
  return {
    db: store?.db ?? openUserDb().executor,
    now: store?.now ?? Date.now,
  };
}

export function getProgressRows(scopeKey: string, periodKey: string, store?: AzkarStore): AzkarProgressRow[] {
  const { db } = resolveStore(store);
  return db.all<AzkarProgressRow>(`${PROGRESS_SELECT} WHERE scope_key = ? AND period_key = ? ORDER BY item_key`, [
    scopeKey,
    periodKey,
  ]);
}

/**
 * Applies one tap to a unit in one transaction and persists the result when the tap is accepted. `unitKey` is the
 * reader unit's key (an item key, or a repeat-group key), stored as the row's `item_key`.
 */
export function recordTap(
  scopeKey: string,
  periodKey: string,
  unitKey: string,
  requiredCount: number | null,
  store?: AzkarStore,
): TapResult {
  const { db, now } = resolveStore(store);

  return db.transaction(() => {
    const at = now();
    const row = db.get<AzkarProgressRow>(`${PROGRESS_SELECT} WHERE scope_key = ? AND period_key = ? AND item_key = ?`, [
      scopeKey,
      periodKey,
      unitKey,
    ]);
    const state =
      row === undefined
        ? emptyTapState()
        : { currentCount: row.currentCount, completedAt: row.completedAt, updatedAt: row.updatedAt };

    const result = applyTap(state, requiredCount, at);
    if (result.accepted) {
      db.run(
        `INSERT INTO azkar_progress (scope_key, period_key, item_key, current_count, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(scope_key, period_key, item_key) DO UPDATE SET
           current_count = excluded.current_count,
           completed_at = excluded.completed_at,
           updated_at = excluded.updated_at`,
        [scopeKey, periodKey, unitKey, result.state.currentCount, result.state.completedAt, at],
      );
    }

    return result;
  });
}

/** Clears one unit's progress in one period. */
export function resetUnit(scopeKey: string, periodKey: string, unitKey: string, store?: AzkarStore): void {
  const { db } = resolveStore(store);
  db.run('DELETE FROM azkar_progress WHERE scope_key = ? AND period_key = ? AND item_key = ?', [
    scopeKey,
    periodKey,
    unitKey,
  ]);
}

/**
 * Marks a whole session complete for its scope and period («إتمام»), under the reserved `__session__` key. Idempotent:
 * a second call moves the marker's time.
 */
export function markSessionComplete(scopeKey: string, periodKey: string, store?: AzkarStore): void {
  const { db, now } = resolveStore(store);
  const at = now();
  db.run(
    `INSERT INTO azkar_progress (scope_key, period_key, item_key, current_count, completed_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(scope_key, period_key, item_key) DO UPDATE SET
       completed_at = excluded.completed_at,
       updated_at = excluded.updated_at`,
    [scopeKey, periodKey, SESSION_UNIT_KEY, at, at],
  );
}

/** Whether a session was marked complete for this scope and period. */
export function isSessionComplete(scopeKey: string, periodKey: string, store?: AzkarStore): boolean {
  const { db } = resolveStore(store);
  const row = db.get<{ completedAt: number | null }>(
    'SELECT completed_at AS completedAt FROM azkar_progress WHERE scope_key = ? AND period_key = ? AND item_key = ?',
    [scopeKey, periodKey, SESSION_UNIT_KEY],
  );
  return row !== undefined && row.completedAt !== null;
}

/** Clears a scope's progress in one period («إعادة الضبط»). Also clears the session marker. */
export function resetScope(scopeKey: string, periodKey: string, store?: AzkarStore): void {
  const { db } = resolveStore(store);
  db.run('DELETE FROM azkar_progress WHERE scope_key = ? AND period_key = ?', [scopeKey, periodKey]);
}

/** Per (scope, period) summaries, newest activity first. */
export function listScopeSummaries(store?: AzkarStore): ScopeSummary[] {
  const { db } = resolveStore(store);
  return db.all<ScopeSummary>(
    `SELECT
       scope_key AS scopeKey,
       period_key AS periodKey,
       count(CASE WHEN item_key <> '__session__' THEN completed_at END) AS completedUnits,
       max(updated_at) AS updatedAt
     FROM azkar_progress
     GROUP BY scope_key, period_key
     ORDER BY updatedAt DESC`,
  );
}

/**
 * The scope behind Home's «تابع» card. `resolve` gives the current period and unit total for a scope key, as
 * the caller computes them from content; `null` means the scope no longer exists.
 */
export function lastActiveScope(
  resolve: (scopeKey: string) => ScopeResolution | null,
  store?: AzkarStore,
): { scopeKey: string; periodKey: string } | null {
  return pickLastActiveScope(listScopeSummaries(store), resolve);
}
