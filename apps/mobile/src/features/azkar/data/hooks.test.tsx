import { renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import { i18n } from '@/core/i18n';
import type { SqlExecutor } from '@/core/db/sql-executor';
import type { ScopeSummary } from './progress';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { cachedCategorySummaries, useQuranReferenceLabel, useSessionCategoryProgress } from './hooks';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { periodKey } from './progress';

// The content database and the progress summaries are injected per test. Names start with `mock` so the factories may use them.
let mockExecutor: SqlExecutor | null = null;
let mockRows: ScopeSummary[] = [];

jest.mock('@/core/db/content/open', () => ({
  useContentDb: () => ({ ready: true, error: null }),
  openContentDb: () => ({ executor: mockExecutor }),
}));

jest.mock('./progress-summary-store', () => ({
  azkarProgressSummaries: {
    subscribe: () => () => undefined,
    getSnapshot: () => mockRows,
  },
}));

describe('cachedCategorySummaries', () => {
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

  it('builds the summaries once per revision and shares them with every reader', () => {
    const first = cachedCategorySummaries(executor, 'ar', 101);
    const second = cachedCategorySummaries(executor, 'ar', 101);

    expect(second).toBe(first);
    expect(first.map((category) => category.unitCount)).toContain(3);
  });

  it('rebuilds the summaries when the catalogue revision moves', () => {
    const before = cachedCategorySummaries(executor, 'ar', 102);
    const after = cachedCategorySummaries(executor, 'ar', 103);

    expect(after).not.toBe(before);
    expect(after).toEqual(before);
  });

  it('rebuilds the summaries for a different database handle', () => {
    const before = cachedCategorySummaries(executor, 'ar', 104);
    const other = openAzkarContentDb();
    loadAzkarDevFixtures(other.executor);

    const after = cachedCategorySummaries(other.executor, 'ar', 104);
    other.database.close();

    expect(after).not.toBe(before);
  });

  it('answers from the cache without reading the content database again', () => {
    cachedCategorySummaries(executor, 'ar', 105);
    let reads = 0;
    const counting: SqlExecutor = {
      ...executor,
      all: (<T,>(sql: string, params?: readonly unknown[]) => {
        reads += 1;
        return executor.all<T>(sql, params as never);
      }) as SqlExecutor['all'],
    };

    cachedCategorySummaries(counting, 'ar', 106);
    const afterFirstBuild = reads;
    expect(afterFirstBuild).toBeGreaterThan(0);

    cachedCategorySummaries(counting, 'ar', 106);
    expect(reads).toBe(afterFirstBuild);
  });
});

describe('useSessionCategoryProgress across midnight', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    mockExecutor = opened.executor;
    loadAzkarDevFixtures(opened.executor);
    i18n.changeLanguage('ar');
    jest.useFakeTimers({ now: new Date(2026, 10, 1, 23, 59, 0) });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockExecutor = null;
    mockRows = [];
    database.close();
  });

  it('counts only today: yesterday’s progress stops counting once the day rolls over', async () => {
    // The morning category is daily. Two units were done yesterday, the day before the rollover.
    mockRows = [
      {
        completedUnits: 2,
        periodKey: periodKey('daily', new Date(2026, 10, 1, 23, 59, 0)),
        scopeKey: 'category:morning',
        updatedAt: 1,
      },
    ];

    const { result, rerender } = await renderHook(() => useSessionCategoryProgress('ar'));
    const morning = () => result.current.find((session) => session.id === 'morning');
    expect(morning()).toMatchObject({ completed: 2 });

    // Cross midnight, then render again (the hook re-reads its date key on render, as useHomeWird does).
    jest.setSystemTime(new Date(2026, 10, 2, 0, 1, 0));
    await rerender(undefined);

    expect(morning()).toMatchObject({ completed: 0, done: false });
  });
});

describe('useQuranReferenceLabel', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    mockExecutor = opened.executor;
    opened.executor.run(
      `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end)
       VALUES (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 286, 1, 2, 49)`,
    );
  });

  afterEach(async () => {
    database.close();
    mockExecutor = null;
    await i18n.changeLanguage('ar');
  });

  it('formats one verse and a range in Arabic, with Arabic digits', async () => {
    await i18n.changeLanguage('ar');
    const { result } = await renderHook(() => useQuranReferenceLabel('ar'));

    expect(result.current({ surah: 2, verseFrom: 255, verseTo: 255 })).toBe('سورة البقرة · ٢٥٥');
    expect(result.current({ surah: 2, verseFrom: 285, verseTo: 286 })).toBe('سورة البقرة · ٢٨٥–٢٨٦');
  });

  it('formats the English name in English', async () => {
    await i18n.changeLanguage('en');
    const { result } = await renderHook(() => useQuranReferenceLabel('en'));

    expect(result.current({ surah: 2, verseFrom: 255, verseTo: 255 })).toBe('Surah Al-Baqarah · 255');
  });

  it('is null for no passage and for a surah that cannot be read', async () => {
    const { result } = await renderHook(() => useQuranReferenceLabel('ar'));

    expect(result.current(null)).toBeNull();
    expect(result.current({ surah: 99, verseFrom: 1, verseTo: 1 })).toBeNull();
  });
});
