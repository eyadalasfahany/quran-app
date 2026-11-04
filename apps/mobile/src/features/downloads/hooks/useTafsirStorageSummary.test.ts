import { renderHook } from '@testing-library/react-native';

import { openContentDb } from '@/core/db/content/open';
import { listCatalogTafsirs } from '@/features/reader/data/tafsir';

import { useTafsirStorageSummary } from './useTafsirStorageSummary';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));
jest.mock('@/features/reader/data/tafsir', () => ({ listCatalogTafsirs: jest.fn() }));

const mockOpenContentDb = jest.mocked(openContentDb);
const mockListCatalogTafsirs = jest.mocked(listCatalogTafsirs);

describe('useTafsirStorageSummary', () => {
  beforeEach(() => {
    mockOpenContentDb.mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
  });

  it('returns empty summary when no tafsirs are installed', async () => {
    mockListCatalogTafsirs.mockReturnValue([
      { resourceId: 1, nameAr: 'A', packSizeBytes: 1, installed: false } as never,
      { resourceId: 2, nameAr: 'B', packSizeBytes: 2, installed: false } as never,
    ]);
    const { result } = await renderHook(() => useTafsirStorageSummary());
    expect(result.current).toEqual({ perTafsir: [], totalBytes: 0 });
  });

  it('filters installed rows and sums packSizeBytes', async () => {
    mockListCatalogTafsirs.mockReturnValue([
      { resourceId: 1, nameAr: 'A', packSizeBytes: 10_000_000, installed: true } as never,
      { resourceId: 2, nameAr: 'B', packSizeBytes: 5_000_000, installed: false } as never,
      { resourceId: 3, nameAr: 'C', packSizeBytes: 8_000_000, installed: true } as never,
    ]);
    const { result } = await renderHook(() => useTafsirStorageSummary());
    expect(result.current.perTafsir).toHaveLength(2);
    expect(result.current.totalBytes).toBe(18_000_000);
  });

  it('propagates null nameAr', async () => {
    mockListCatalogTafsirs.mockReturnValue([
      { resourceId: 1, nameAr: null, packSizeBytes: 100, installed: true } as never,
    ]);
    const { result } = await renderHook(() => useTafsirStorageSummary());
    expect(result.current.perTafsir[0]?.nameAr).toBeNull();
  });

  it('returns zeros when openContentDb throws', async () => {
    mockOpenContentDb.mockImplementation(() => {
      throw new Error('not open');
    });
    const { result } = await renderHook(() => useTafsirStorageSummary());
    expect(result.current).toEqual({ perTafsir: [], totalBytes: 0 });
  });
});
