import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_NAME_AR } from '../constants';
import { loadNamesDevFixtures } from './__fixtures__/dev-fixtures';
import { getNameBySlug, hasNamesContent, listNames } from './content-repository';

describe('names content repository', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('reports no content until a name row exists', () => {
    expect(hasNamesContent(executor)).toBe(false);
    loadNamesDevFixtures(executor);
    expect(hasNamesContent(executor)).toBe(true);
  });

  it('lists placeholder names without real name strings in tests', () => {
    loadNamesDevFixtures(executor);
    const names = listNames(executor);
    expect(names).toHaveLength(1);
    expect(names[0]?.nameAr).toBe(FIXTURE_NAME_AR);
    expect(names[0]?.nameSlug).toBe('fixture-name-1');
  });

  it('loads detail with list metadata', () => {
    loadNamesDevFixtures(executor);
    const detail = getNameBySlug(executor, 'fixture-name-1');
    expect(detail?.list.sourceLabelAr).toBe('FIXTURE source label');
    expect(detail?.references).toEqual([]);
  });
});
