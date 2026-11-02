import type { DatabaseSync } from 'node:sqlite';

import { AZKAR_ROLLING_DAYS, AZKAR_SLOTS } from '@/features/notifications/budget';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { canScheduleAzkarReminder, planAzkarBudget } from './budget-plan';
import { saveReminder, type RemindersStore } from './reminders-repository';

type Planned = Parameters<typeof planAzkarBudget>[0][number];

function prayer(id: string, updatedAt: number, targetType: Planned['targetType'] = 'entry'): Planned {
  return {
    id,
    targetType,
    enabled: true,
    triggerType: 'prayer_relative',
    clockTime: null,
    prayer: 'asr',
    offsetMinutes: 0,
    updatedAt,
  };
}

function clock(id: string, updatedAt: number, targetType: 'category' | 'entry' = 'entry'): Planned {
  return { ...prayer(id, updatedAt, targetType), triggerType: 'clock', clockTime: '06:30', prayer: null, offsetMinutes: null };
}

function many(count: number, make: (index: number) => Planned): Planned[] {
  return Array.from({ length: count }, (_, index) => make(index + 1));
}

const sum = (windows: Map<string, number>) => [...windows.values()].reduce((total, days) => total + days, 0);

describe('planAzkarBudget', () => {
  it('keeps every full window when everything fits', () => {
    const plan = planAzkarBudget(many(5, (index) => prayer(`c${index}`, index, 'category')));

    expect(plan.unscheduled).toEqual([]);
    expect([...plan.windows.values()]).toEqual([4, 4, 4, 4, 4]);
  });

  it('shrinks the rolling windows before it refuses anything: six prayer reminders share the 21 slots', () => {
    const plan = planAzkarBudget(many(6, (index) => prayer(`c${index}`, index, 'category')));

    expect(plan.unscheduled).toEqual([]);
    // Each keeps at least one day; the oldest keep their full window, the newest shrink.
    expect([...plan.windows.values()]).toEqual([4, 4, 4, 4, 4, 1]);
    expect(sum(plan.windows)).toBe(AZKAR_SLOTS);
  });

  it('shrinks no window below one day', () => {
    const plan = planAzkarBudget(many(21, (index) => prayer(`e${index}`, index)));

    expect(plan.unscheduled).toEqual([]);
    expect([...plan.windows.values()].every((days) => days === 1)).toBe(true);
  });

  it('refuses the newest reminder only when even one slot each does not fit', () => {
    const plan = planAzkarBudget(many(24, (index) => prayer(`e${index}`, index)));

    expect(plan.unscheduled).toEqual(['e22', 'e23', 'e24']);
    expect(plan.windows.has('e24')).toBe(false);
    expect(sum(plan.windows)).toBeLessThanOrEqual(AZKAR_SLOTS);
  });

  it('refuses the newest clock reminder too, counting one slot each', () => {
    const plan = planAzkarBudget([...many(20, (index) => clock(`k${index}`, index)), clock('k21', 21), clock('k22', 22)]);

    expect(plan.unscheduled).toEqual(['k22']);
    expect(plan.windows.get('k21')).toBe(1);
  });

  it('orders categories before entries before my duas when the pool is tight', () => {
    const plan = planAzkarBudget(
      [prayer('my-dua', 1, 'my_dua'), prayer('entry-old', 2), prayer('category-old', 3, 'category')],
      1,
    );

    expect([...plan.windows.keys()]).toEqual(['category-old']);
    expect(plan.unscheduled).toEqual(['entry-old', 'my-dua']);
  });

  it('orders categories before entries, then by the oldest update, then by id', () => {
    // One slot only: the category wins over an older entry, and the older of two categories wins.
    const plan = planAzkarBudget(
      [prayer('entry-old', 1), prayer('category-new', 9, 'category'), prayer('category-old', 2, 'category')],
      1,
    );

    expect([...plan.windows.keys()]).toEqual(['category-old']);
    expect(plan.unscheduled).toEqual(['category-new', 'entry-old']);
  });

  it('plans the same way whatever the input order', () => {
    const forward = planAzkarBudget(many(24, (index) => prayer(`e${index}`, index)));
    const backward = planAzkarBudget([...many(24, (index) => prayer(`e${index}`, index))].reverse());

    expect(backward.unscheduled).toEqual(forward.unscheduled);
    expect([...backward.windows]).toEqual([...forward.windows]);
  });

  it('ignores reminders with nothing to schedule: disabled, no time, or no prayer', () => {
    const plan = planAzkarBudget([
      { ...clock('off', 1), enabled: false },
      { ...clock('no-time', 2), clockTime: null },
      { ...prayer('no-prayer', 3), prayer: null },
      { ...prayer('no-offset', 4), offsetMinutes: null },
    ]);

    expect(plan.windows.size).toBe(0);
    expect(plan.unscheduled).toEqual([]);
  });

  it('uses the Azkar share and the rolling window by default', () => {
    expect(AZKAR_SLOTS).toBe(21);
    expect(AZKAR_ROLLING_DAYS).toBe(4);
    expect(planAzkarBudget(many(6, (index) => prayer(`c${index}`, index))).windows.get('c1')).toBe(AZKAR_ROLLING_DAYS);
  });
});

describe('canScheduleAzkarReminder', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;
  let store: RemindersStore;
  let tick: number;

  beforeEach(() => {
    const opened = openAzkarUserDb();
    database = opened.database;
    executor = opened.executor;
    tick = 0;
    let ids = 0;
    store = { db: executor, now: () => (tick += 1), uuid: () => `r-${(ids += 1)}` };
  });

  afterEach(() => {
    database.close();
  });

  function fillPool(count: number) {
    for (let index = 1; index <= count; index += 1) {
      saveReminder(
        { targetType: 'entry', targetKey: `e-${index}`, enabled: true, triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 0 },
        store,
      );
    }
  }

  const clockInput = (targetKey: string, enabled = true) => ({
    targetType: 'entry' as const,
    targetKey,
    enabled,
    triggerType: 'clock' as const,
    clockTime: '06:30',
    prayer: null,
    offsetMinutes: null,
  });

  it('allows a reminder while the pool has room', () => {
    fillPool(3);

    expect(canScheduleAzkarReminder(clockInput('new'), store)).toBe(true);
  });

  it('refuses a new schedulable reminder when the pool is full', () => {
    fillPool(21);

    expect(canScheduleAzkarReminder(clockInput('new'), store)).toBe(false);
  });

  it('always allows turning a reminder off, and a reminder with nothing to schedule', () => {
    fillPool(21);

    expect(canScheduleAzkarReminder(clockInput('new', false), store)).toBe(true);
    expect(canScheduleAzkarReminder({ ...clockInput('new'), clockTime: null }, store)).toBe(true);
  });

  it('does not count the reminder against itself when it is already in the pool', () => {
    fillPool(21);

    expect(canScheduleAzkarReminder(clockInput('e-1'), store)).toBe(true);
  });
});
