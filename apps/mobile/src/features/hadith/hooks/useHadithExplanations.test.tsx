import { act, renderHook } from '@testing-library/react-native';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';

import { useHadithExplanations } from './hooks';

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
}));
jest.mock('@/core/i18n/useLocale', () => ({ useLocale: () => 'ar' }));

// Placeholder text only.
const SLUG = 'fixture-explained';

describe('useHadithExplanations', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    executor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default)
       VALUES (71, 'hadith_explanations', 'FIXTURE source', 'مصدر تجريبي', 1, 1, 0)`,
    );
    executor.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (71, 'hadith_explanations', 1, 'fixture', 0)`,
    );
    executor.run(
      `INSERT INTO hadith_explanations (resource_id, id, body_ar, source_url) VALUES (71, 1, 'FIXTURE explanation 1 — not a hadith', 'https://example.test/fixture')`,
    );
    executor.run(
      `INSERT INTO hadith_explanation_links (resource_id, collection_slug, hadith_number, explanation_id) VALUES (71, ?, '42', 1)`,
      [SLUG],
    );
  });

  afterEach(() => {
    database.close();
  });

  it('returns the explanations of the hadith', async () => {
    const { result } = await renderHook(() => useHadithExplanations(SLUG, '42'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.explanation).toBe('FIXTURE explanation 1 — not a hadith');
  });

  it('returns nothing for another hadith number', async () => {
    const { result } = await renderHook(() => useHadithExplanations(SLUG, '43'));
    expect(result.current).toEqual([]);
  });

  it('starts empty when the content database is not open, and reads after a catalogue bump', async () => {
    mockOpen = () => {
      throw new Error('not open');
    };
    const { result } = await renderHook(() => useHadithExplanations(SLUG, '42'));
    expect(result.current).toEqual([]);

    mockOpen = () => ({ executor });
    await act(async () => {
      bumpCatalogVersion();
    });
    expect(result.current).toHaveLength(1);
  });
});
