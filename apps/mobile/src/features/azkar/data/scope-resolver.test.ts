import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { listCategoryUnits } from './content-repository';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { resolveAzkarScope } from './scope-resolver';

const NOW = new Date(2026, 10, 1, 9, 0);

describe('resolveAzkarScope', () => {
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

  it('resolves a category to its period and unit total for the locale', () => {
    const resolved = resolveAzkarScope(executor, 'ar', NOW)('category:morning');

    expect(resolved).toMatchObject({
      scopeKey: 'category:morning',
      periodKey: '2026-11-01',
      categoryId: 'morning',
      entryKey: null,
      occasion: 'morning',
    });
    expect(resolved?.total).toBe(listCategoryUnits(executor, 'morning', 'ar').length);
  });

  it('resolves an entry scope on the session period', () => {
    const resolved = resolveAzkarScope(executor, 'ar', NOW)('entry:fixture:entry-001');

    expect(resolved).toMatchObject({ scopeKey: 'entry:fixture:entry-001', periodKey: 'session', entryKey: 'fixture:entry-001' });
    expect(resolved?.total).toBeGreaterThan(0);
  });

  it('counts only the visible entries of a browse topic that lost some to Duas (ADR 0091)', () => {
    executor.run(`UPDATE azkar_entries SET home = 'duas' WHERE entry_key = 'fixture:entry-008'`);

    expect(resolveAzkarScope(executor, 'ar', NOW)('category:home-and-family')?.total).toBe(1);
  });

  it('does not resolve a browse topic whose entries have all moved, so it is not continued or listed', () => {
    executor.run(`UPDATE azkar_entries SET home = 'duas' WHERE entry_key = 'fixture:entry-007'`);

    expect(resolveAzkarScope(executor, 'ar', NOW)('category:travel')).toBeNull();
  });

  it('keeps a session resolving even when its entry is typed dua', () => {
    executor.run(`UPDATE azkar_entries SET home = 'duas' WHERE entry_key = 'fixture:entry-001'`);

    expect(resolveAzkarScope(executor, 'ar', NOW)('category:morning')?.total).toBe(3);
  });

  it('still resolves an entry scope for a moved entry (a reminder or Home target)', () => {
    executor.run(`UPDATE azkar_entries SET home = 'duas' WHERE entry_key = 'fixture:entry-008'`);

    expect(resolveAzkarScope(executor, 'ar', NOW)('entry:fixture:entry-008')).toMatchObject({
      entryKey: 'fixture:entry-008',
      periodKey: 'session',
      total: 1,
    });
  });

  it('returns null for unknown categories, unknown entries and unknown prefixes', () => {
    const resolve = resolveAzkarScope(executor, 'ar', NOW);

    expect(resolve('category:missing')).toBeNull();
    expect(resolve('entry:missing')).toBeNull();
    expect(resolve('other:morning')).toBeNull();
  });
});
