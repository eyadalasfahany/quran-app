import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { hasAzkarContent, listCategories, getEntry } from './content-repository';
import { azkarDevFixturesEnabled, loadAzkarDevFixtures } from './dev-fixtures';

function count(database: DatabaseSync, table: string): number {
  return (database.prepare(`SELECT count(*) AS count FROM ${table} WHERE resource_id = -1`).get() as { count: number })
    .count;
}

describe('azkar development fixtures', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;
  const originalFlag = process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
    if (originalFlag === undefined) {
      delete process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES;
    } else {
      process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES = originalFlag;
    }
  });

  it('is enabled only with the development flag set to 1', () => {
    delete process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES;
    expect(azkarDevFixturesEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES = '';
    expect(azkarDevFixturesEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES = '0';
    expect(azkarDevFixturesEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES = '1';
    expect(azkarDevFixturesEnabled()).toBe(true);
  });

  it('leaves content.db without Azkar rows until loaded', () => {
    expect(hasAzkarContent(executor)).toBe(false);
  });

  it('loads twice without duplicates', () => {
    loadAzkarDevFixtures(executor);
    const first = {
      entries: count(database, 'azkar_entries'),
      items: count(database, 'azkar_items'),
      segments: count(database, 'azkar_segments'),
      categories: count(database, 'azkar_categories'),
      notes: count(database, 'azkar_notes'),
      chapters: count(database, 'azkar_chapters'),
    };

    loadAzkarDevFixtures(executor);

    expect({
      entries: count(database, 'azkar_entries'),
      items: count(database, 'azkar_items'),
      segments: count(database, 'azkar_segments'),
      categories: count(database, 'azkar_categories'),
      notes: count(database, 'azkar_notes'),
      chapters: count(database, 'azkar_chapters'),
    }).toEqual(first);
    expect(first).toEqual({ entries: 8, items: 13, segments: 14, categories: 8, notes: 5, chapters: 2 });
  });

  it('covers the session and browse categories the screens need', () => {
    loadAzkarDevFixtures(executor);

    const categories = listCategories(executor, 'ar');
    expect(categories.filter((category) => category.kind === 'session').map((category) => category.id)).toEqual([
      'morning',
      'evening',
      'after_prayer',
      'before_sleep',
      'after_waking',
    ]);
    expect(categories.filter((category) => category.kind === 'browse')).toHaveLength(3);
  });

  it('keeps every fixture text a marked placeholder with the fixture source', () => {
    loadAzkarDevFixtures(executor);

    const texts = database
      .prepare("SELECT text_ar AS text FROM azkar_segments WHERE resource_id = -1 AND text_ar IS NOT NULL")
      .all() as { text: string }[];
    expect(texts.length).toBeGreaterThan(0);
    for (const row of texts) {
      expect(row.text).toMatch(/تجريبي|تجريبية/u);
    }

    const sources = database
      .prepare("SELECT DISTINCT source_version AS version FROM azkar_entries WHERE resource_id = -1")
      .all() as { version: string }[];
    expect(sources).toEqual([{ version: 'taybah-dev-fixture' }]);

    const detail = getEntry(executor, 'fixture:entry-007');
    expect(at(detail?.notes.grade ?? [], 0).textAr).toMatch(/تجريبية/u);
    expect(at(detail?.notes.grade ?? [], 0).sourceName).toBe('[مصدر تجريبي]');
  });

  it('reloading the fixtures leaves rows of other resources untouched', () => {
    database.exec(
      "INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period) VALUES (7, 'real', 'session', 1, 'morning', 'daily')",
    );

    loadAzkarDevFixtures(executor);
    loadAzkarDevFixtures(executor);

    const real = database.prepare("SELECT count(*) AS count FROM azkar_categories WHERE resource_id = 7").get() as {
      count: number;
    };
    expect(real.count).toBe(1);
  });
});
