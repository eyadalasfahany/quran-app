import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { getEntry, listCategoryEntries, listCategoryUnits } from './content-repository';
import { loadAzkarDevFixtures } from './dev-fixtures';

/**
 * The batched category read must return exactly what the per-entry read returns, and it must issue a fixed number of
 * queries for a category instead of one per entry.
 */

/** Wraps an executor and counts the queries it runs. */
function countingExecutor(executor: SqlExecutor) {
  const counts = { all: 0, get: 0 };
  const wrapped: SqlExecutor = {
    exec: (sql) => executor.exec(sql),
    run: (sql, params?: readonly SqlValue[]) => executor.run(sql, params),
    get: <T,>(sql: string, params?: readonly SqlValue[]) => {
      counts.get += 1;
      return executor.get<T>(sql, params);
    },
    all: <T,>(sql: string, params?: readonly SqlValue[]) => {
      counts.all += 1;
      return executor.all<T>(sql, params);
    },
    transaction: (fn) => executor.transaction(fn),
  };
  return { counts, executor: wrapped };
}

describe('azkar category reads are batched', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    loadAzkarDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('returns the same entries, alternatives and items as the single-entry detail read', () => {
    for (const categoryId of ['morning', 'home-and-family']) {
      for (const entry of listCategoryEntries(executor, categoryId)) {
        const detail = getEntry(executor, entry.entry.entryKey);
        expect(detail).toBeDefined();
        expect(entry.variations).toEqual(detail?.variations);
        expect(entry.activeVariation).toBe(detail?.activeVariation);
        expect(entry.items).toEqual(detail?.items);
      }
    }
  });

  it('keeps the same alternative when a * entry is switched, in batch and in detail alike', () => {
    const overrides = { 'fixture:entry-008': 'alternative' };
    const batch = listCategoryEntries(executor, 'home-and-family', overrides).find(
      (entry) => entry.entry.entryKey === 'fixture:entry-008',
    );
    const detail = getEntry(executor, 'fixture:entry-008', overrides);

    expect(batch?.activeVariation).toBe('alternative');
    expect(batch?.items).toEqual(detail?.items);
  });

  it('reads a category with a fixed number of queries, not one per entry', () => {
    const small = countingExecutor(executor);
    listCategoryEntries(small.executor, 'home-and-family');

    const large = countingExecutor(executor);
    listCategoryEntries(large.executor, 'morning');

    // Links with their entries, one items query and one segments query: at most three queries and no single-row gets,
    // whatever the number of entries. The old read issued one get per link and two queries per entry.
    // One get is the active azkar resource lookup, the same for any category size.
    expect(small.counts.get).toBeLessThanOrEqual(1);
    expect(large.counts.get).toBeLessThanOrEqual(1);
    expect(small.counts.all).toBeLessThanOrEqual(3);
    expect(large.counts.all).toBeLessThanOrEqual(3);
  });

  it('builds the reader units of a category from the batched entries, unchanged', () => {
    expect(listCategoryUnits(executor, 'morning', 'ar').map((unit) => unit.unitKey)).toEqual([
      'fixture:item-001',
      'fixture:item-002',
      'fixture:item-003',
    ]);
  });

  it('lists the category summaries with one read per category, not per entry or per item', () => {
    const counted = countingExecutor(executor);
    // Every category's units: the summary count needs them, but the cost does not grow per entry.
    const categories = ['morning', 'evening', 'after_prayer', 'before_sleep', 'after_waking', 'food-and-drink', 'travel', 'home-and-family'];
    for (const id of categories) {
      listCategoryEntries(counted.executor, id);
    }

    expect(counted.counts.get).toBeLessThanOrEqual(categories.length);
    expect(counted.counts.all).toBeLessThanOrEqual(3 * categories.length);
  });
});
