import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { getProgressRows, lastActiveScope, recordTap, resetScope, resetUnit } from './progress-repository';
import { TAP_GUARD_MS } from './progress';

const SCOPE = 'category:morning';
const PERIOD = '2026-10-31';

type Opened = { database: DatabaseSync; executor: SqlExecutor };

function clockOf(values: number[]) {
  let index = 0;
  return () => at(values, Math.min(index++, values.length - 1));
}

describe('progress repository', () => {
  let opened: Opened;

  beforeEach(() => {
    opened = openAzkarUserDb();
  });

  afterEach(() => {
    opened.database.close();
  });

  it('persists an accepted tap and returns completedNow for haptics', () => {
    const store = { db: opened.executor, now: clockOf([1_000, 2_000]) };

    const first = recordTap(SCOPE, PERIOD, 'fixture:item-001', 2, store);
    expect(first).toMatchObject({ accepted: true, completedNow: false });

    const second = recordTap(SCOPE, PERIOD, 'fixture:item-001', 2, store);
    expect(second).toMatchObject({ accepted: true, completedNow: true });

    expect(getProgressRows(SCOPE, PERIOD, { db: opened.executor })).toEqual([
      {
        scopeKey: SCOPE,
        periodKey: PERIOD,
        itemKey: 'fixture:item-001',
        currentCount: 2,
        completedAt: 2_000,
        updatedAt: 2_000,
      },
    ]);
  });

  it('keeps the double-tap guard across calls, using the stored updated_at', () => {
    const store = { db: opened.executor, now: clockOf([1_000, 1_000 + TAP_GUARD_MS - 1]) };

    recordTap(SCOPE, PERIOD, 'fixture:item-002', 33, store);
    const ignored = recordTap(SCOPE, PERIOD, 'fixture:item-002', 33, store);

    expect(ignored).toMatchObject({ accepted: false, completedNow: false });
    expect(getProgressRows(SCOPE, PERIOD, { db: opened.executor })[0]).toMatchObject({
      currentCount: 1,
      updatedAt: 1_000,
    });
  });

  it('marks a null-count unit done in one tap and writes nothing for a rejected tap', () => {
    const store = { db: opened.executor, now: () => 7_000 };

    recordTap(SCOPE, PERIOD, 'fixture:item-003', null, store);
    const after = recordTap(SCOPE, PERIOD, 'fixture:item-003', null, store);

    expect(after.accepted).toBe(false);
    expect(getProgressRows(SCOPE, PERIOD, { db: opened.executor })).toEqual([
      {
        scopeKey: SCOPE,
        periodKey: PERIOD,
        itemKey: 'fixture:item-003',
        currentCount: 0,
        completedAt: 7_000,
        updatedAt: 7_000,
      },
    ]);
  });

  it('keeps progress per period: a new day starts from zero', () => {
    const store = { db: opened.executor, now: clockOf([1_000]) };
    recordTap(SCOPE, PERIOD, 'fixture:item-001', 3, store);

    expect(getProgressRows(SCOPE, '2026-11-01', { db: opened.executor })).toEqual([]);
  });

  it('resets one unit and a whole scope for one period only', () => {
    const store = { db: opened.executor, now: clockOf([1_000, 2_000, 3_000, 4_000]) };
    recordTap(SCOPE, PERIOD, 'fixture:item-001', 3, store);
    recordTap(SCOPE, PERIOD, 'fixture:item-002', 3, store);
    recordTap(SCOPE, '2026-11-01', 'fixture:item-001', 3, store);

    resetUnit(SCOPE, PERIOD, 'fixture:item-001', { db: opened.executor });
    expect(getProgressRows(SCOPE, PERIOD, { db: opened.executor }).map((row) => row.itemKey)).toEqual([
      'fixture:item-002',
    ]);

    resetScope(SCOPE, PERIOD, { db: opened.executor });
    expect(getProgressRows(SCOPE, PERIOD, { db: opened.executor })).toEqual([]);
    expect(getProgressRows(SCOPE, '2026-11-01', { db: opened.executor })).toHaveLength(1);
  });

  it('finds the scope to continue: newest activity with an incomplete unit', () => {
    const store = { db: opened.executor, now: clockOf([1_000, 2_000, 3_000]) };
    recordTap('entry:fixture:entry-001', 'session', 'fixture:item-001', null, store);
    recordTap(SCOPE, PERIOD, 'fixture:item-001', 3, store);
    recordTap('category:travel', 'session', 'fixture:item-007', 5, store);

    const resolve = (scopeKey: string) => {
      if (scopeKey === SCOPE) {
        return { periodKey: PERIOD, total: 3 };
      }
      if (scopeKey === 'category:travel') {
        return { periodKey: 'session', total: 1 };
      }
      if (scopeKey === 'entry:fixture:entry-001') {
        return { periodKey: 'session', total: 1 };
      }
      return null;
    };

    // travel has the newest activity but its one unit is not complete; it still counts as incomplete.
    expect(lastActiveScope(resolve, { db: opened.executor })).toEqual({
      scopeKey: 'category:travel',
      periodKey: 'session',
    });

    // When the newest scope's period is no longer current, it is skipped for the next incomplete scope.
    const travelStale = (scopeKey: string) =>
      scopeKey === 'category:travel' ? { periodKey: 'session-next', total: 1 } : resolve(scopeKey);
    expect(lastActiveScope(travelStale, { db: opened.executor })).toEqual({ scopeKey: SCOPE, periodKey: PERIOD });
  });
});
