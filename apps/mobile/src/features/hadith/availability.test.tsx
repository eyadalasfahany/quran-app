import { renderHook } from '@testing-library/react-native';

import { useContentDb } from '@/core/db/content/open';

import { useHadithAvailable, useHadithCatalog } from './hooks';
import { useHadithHomeEntry } from './availability';

jest.mock('./hooks', () => ({
  useHadithAvailable: jest.fn(() => false),
  useHadithCatalog: jest.fn(() => []),
}));

jest.mock('@/core/db/content/open', () => ({
  useContentDb: jest.fn(() => ({ ready: true, error: null })),
}));

const ENTRY = {
  resourceId: 1,
  name: null,
  nameAr: null,
  authorEn: null,
  authorAr: null,
  version: 1,
  packSizeBytes: 1,
  installed: false,
  slug: null,
};

describe('useHadithHomeEntry', () => {
  beforeEach(() => {
    jest.mocked(useHadithAvailable).mockReturnValue(false);
    jest.mocked(useHadithCatalog).mockReturnValue([]);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
  });

  it('tile is false until a pack is installed', async () => {
    const { result } = await renderHook(() => useHadithHomeEntry());
    expect(result.current.tile).toBe(false);
  });

  it('menuCard is true when the catalogue lists a collection even if none is installed', async () => {
    jest.mocked(useHadithCatalog).mockReturnValue([ENTRY]);
    const { result } = await renderHook(() => useHadithHomeEntry());
    expect(result.current).toEqual({ tile: false, menuCard: true });
  });

  it('both are false while the content database is not ready', async () => {
    jest.mocked(useHadithAvailable).mockReturnValue(true);
    jest.mocked(useHadithCatalog).mockReturnValue([ENTRY]);
    jest.mocked(useContentDb).mockReturnValue({ ready: false, error: null });
    const { result } = await renderHook(() => useHadithHomeEntry());
    expect(result.current).toEqual({ tile: false, menuCard: false });
  });

  it('both are true when a pack is installed', async () => {
    jest.mocked(useHadithAvailable).mockReturnValue(true);
    const { result } = await renderHook(() => useHadithHomeEntry());
    expect(result.current).toEqual({ tile: true, menuCard: true });
  });
});
