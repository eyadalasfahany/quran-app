import { renderHook, waitFor } from '@testing-library/react-native';
import { getNetworkStateAsync } from 'expo-network';
import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { installResource } from '@/core/sync';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { resetHadithDownloads, useHadithDownloads } from '../downloads';

import { useEnsureHadithExplanations } from './useEnsureHadithExplanations';

// The real download store: this proves the explanation install honours the Wi-Fi-only setting.
jest.mock('@/core/sync', () => ({ installResource: jest.fn(async () => ({ status: 'installed' as const })) }));
jest.mock('@/features/audio/settings', () => ({ getWifiOnlyDownloads: jest.fn(() => true) }));
jest.mock('@/core/network/useOnline', () => ({ useOnline: () => true }));
let mockExecutor: SqlExecutor;
jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: mockExecutor }),
  useContentDb: () => ({ ready: true }),
}));

const EXPLANATION = 71;

function onNetwork(type: 'WIFI' | 'CELLULAR') {
  jest.mocked(getNetworkStateAsync).mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type,
  } as Awaited<ReturnType<typeof getNetworkStateAsync>>);
}

describe('useEnsureHadithExplanations on the download store', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    const opened = openAzkarContentDb();
    database = opened.database;
    mockExecutor = opened.executor;
    mockExecutor.run(
      `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (61, 'hadith_collections', 1, 'fixture', 0)`,
    );
    mockExecutor.run(
      `INSERT INTO hadith_collections (resource_id, id, slug, source_code, attribution_ar, attribution_en, total_hadith, books_count)
       VALUES (61, 1, 'fixture-wifi', 'taybah-dev-fixture', 'FIXTURE attribution', 'FIXTURE attribution', 0, 0)`,
    );
    mockExecutor.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, version, pack_size_bytes, is_default) VALUES (?, 'hadith_explanations', 'FIXTURE source', 1, 1, 0)`,
      [EXPLANATION],
    );
  });

  afterEach(() => {
    database.close();
  });

  it('waits on cellular while Wi-Fi only is on, and does not download', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(true);
    onNetwork('CELLULAR');
    await renderHook(() => useEnsureHadithExplanations());
    await waitFor(() => expect(useHadithDownloads.getState().byId[EXPLANATION]?.status).toBe('waiting'));
    expect(installResource).not.toHaveBeenCalled();
    expect(useHadithDownloads.getState().byId[EXPLANATION]).toEqual({ status: 'waiting', progress: 0, reason: 'wifi' });
  });

  it('downloads on Wi-Fi while Wi-Fi only is on', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(true);
    onNetwork('WIFI');
    await renderHook(() => useEnsureHadithExplanations());
    await waitFor(() => expect(installResource).toHaveBeenCalledWith(EXPLANATION, expect.any(Object)));
  });

  it('downloads on cellular when Wi-Fi only is off', async () => {
    jest.mocked(getWifiOnlyDownloads).mockReturnValue(false);
    onNetwork('CELLULAR');
    await renderHook(() => useEnsureHadithExplanations());
    await waitFor(() => expect(installResource).toHaveBeenCalledWith(EXPLANATION, expect.any(Object)));
  });
});
