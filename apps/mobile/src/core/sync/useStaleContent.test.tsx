import { act, renderHook } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { openAudioTestDb } from '@/features/audio/data/test-db';

import { useCatalogVersion } from './catalog-version';
import { isContentStale, oldestCheckedAt, STALE_CONTENT_MS, useStaleContent } from './useStaleContent';

const mockContent: { executor: SqlExecutor | null } = { executor: null };

jest.mock('@/core/db/content/open', () => ({
  useContentDb: () => ({ ready: true, error: null }),
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
}));

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function checkResource(executor: SqlExecutor, resourceId: number, checkedAt: number): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'tafsirs', 1, 'a', ?)`,
    [resourceId, checkedAt],
  );
}

beforeEach(() => {
  const opened = openAudioTestDb();
  mockContent.executor = opened.executor;
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  mockContent.executor = null;
  jest.restoreAllMocks();
  useCatalogVersion.setState({ syncSettled: false, version: 0 });
});

describe('isContentStale', () => {
  it('is stale only when the oldest check is more than seven days old', () => {
    expect(isContentStale(NOW - STALE_CONTENT_MS, NOW)).toBe(false);
    expect(isContentStale(NOW - STALE_CONTENT_MS - 1, NOW)).toBe(true);
  });

  it('is not stale when nothing is installed', () => {
    expect(isContentStale(null, NOW)).toBe(false);
  });
});

describe('oldestCheckedAt', () => {
  it('reads the oldest last_checked_at across the installed resources', () => {
    const executor = mockContent.executor as SqlExecutor;
    checkResource(executor, 1, NOW - DAY);
    checkResource(executor, 2, NOW - 9 * DAY);

    expect(oldestCheckedAt(executor)).toBe(NOW - 9 * DAY);
  });

  it('is null when no resource is installed', () => {
    expect(oldestCheckedAt(mockContent.executor as SqlExecutor)).toBeNull();
  });
});

describe('useStaleContent', () => {
  it('is false when every resource was checked within seven days', async () => {
    checkResource(mockContent.executor as SqlExecutor, 1, NOW - 2 * DAY);

    const view = await renderHook(() => useStaleContent());

    expect(view.result.current).toBe(false);
  });

  it('is true when a resource has not been checked for more than seven days', async () => {
    checkResource(mockContent.executor as SqlExecutor, 1, NOW - 8 * DAY);

    const view = await renderHook(() => useStaleContent());

    expect(view.result.current).toBe(true);
  });

  it('reads again after a sync settles, so the banner goes once the content is checked', async () => {
    const executor = mockContent.executor as SqlExecutor;
    checkResource(executor, 1, NOW - 8 * DAY);
    const view = await renderHook(() => useStaleContent());
    expect(view.result.current).toBe(true);

    executor.run('UPDATE installed_resources SET last_checked_at = ?', [NOW]);
    act(() => {
      useCatalogVersion.setState({ syncSettled: true });
    });
    await view.rerender({});

    expect(view.result.current).toBe(false);
  });
});
