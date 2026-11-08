import { renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';

import { useEnsureHadithExplanations } from './useEnsureHadithExplanations';

const mockStart = jest.fn(async (_resourceId: number) => undefined);
const mockOnline = { value: true };
const mockContentDb = { ready: true };
let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('../downloads', () => ({
  useHadithDownloads: { getState: () => ({ start: mockStart }) },
}));
jest.mock('@/core/network/useOnline', () => ({ useOnline: () => mockOnline.value }));
jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
  useContentDb: () => mockContentDb,
}));

const EXPLANATION = 71;

function installCollection(executor: SqlExecutor) {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (61, 'hadith_collections', 1, 'fixture', 0)`,
  );
  executor.run(
    `INSERT INTO hadith_collections (resource_id, id, slug, source_code, attribution_ar, attribution_en, total_hadith, books_count)
     VALUES (61, 1, 'fixture-ensure', 'taybah-dev-fixture', 'FIXTURE attribution', 'FIXTURE attribution', 0, 0)`,
  );
}

function catalogExplanation(executor: SqlExecutor, installed: boolean) {
  executor.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
     VALUES (?, 'hadith_explanations', 'FIXTURE source', 'مصدر تجريبي', 1, 1, 0)`,
    [EXPLANATION],
  );
  if (installed) {
    executor.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'hadith_explanations', 1, 'fixture', 0)`,
      [EXPLANATION],
    );
  }
}

describe('useEnsureHadithExplanations', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline.value = true;
    mockContentDb.ready = true;
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
  });

  afterEach(() => {
    database.close();
  });

  it('starts the missing explanation install when online and a collection is installed', async () => {
    installCollection(executor);
    catalogExplanation(executor, false);
    await renderHook(() => useEnsureHadithExplanations());
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith(EXPLANATION);
  });

  it('does nothing while offline, and starts once the device is back online', async () => {
    installCollection(executor);
    catalogExplanation(executor, false);
    mockOnline.value = false;
    const { rerender } = await renderHook(() => useEnsureHadithExplanations());
    expect(mockStart).not.toHaveBeenCalled();

    mockOnline.value = true;
    await rerender({});
    expect(mockStart).toHaveBeenCalledWith(EXPLANATION);
  });

  it('does nothing before the content database is ready', async () => {
    installCollection(executor);
    catalogExplanation(executor, false);
    mockContentDb.ready = false;
    await renderHook(() => useEnsureHadithExplanations());
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('does nothing when no collection is installed', async () => {
    catalogExplanation(executor, false);
    await renderHook(() => useEnsureHadithExplanations());
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('does nothing when the explanation is already installed', async () => {
    installCollection(executor);
    catalogExplanation(executor, true);
    await renderHook(() => useEnsureHadithExplanations());
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('does nothing when the database cannot be opened', async () => {
    mockOpen = () => {
      throw new Error('not open');
    };
    await expect(renderHook(() => useEnsureHadithExplanations())).resolves.toBeDefined();
    expect(mockStart).not.toHaveBeenCalled();
  });
});
