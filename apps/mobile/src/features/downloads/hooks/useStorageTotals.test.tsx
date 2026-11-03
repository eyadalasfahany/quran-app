import { renderHook } from '@testing-library/react-native';

import * as audioHook from './useAudioStorageSummary';
import * as fontHook from './useFontStorageBytes';
import * as tafsirHook from './useTafsirStorageSummary';
import { useStorageTotals } from './useStorageTotals';

jest.mock('./useFontStorageBytes');
jest.mock('./useAudioStorageSummary');
jest.mock('./useTafsirStorageSummary');

const mockFont = jest.spyOn(fontHook, 'useFontStorageBytes');
const mockAudio = jest.spyOn(audioHook, 'useAudioStorageSummary');
const mockTafsir = jest.spyOn(tafsirHook, 'useTafsirStorageSummary');

describe('useStorageTotals', () => {
  beforeEach(() => {
    mockFont.mockReturnValue({ bytes: 0, loading: true });
    mockAudio.mockReturnValue({ perReciter: [], totalBytes: 0 });
    mockTafsir.mockReturnValue({ perTafsir: [], totalBytes: 0 });
  });

  it('returns all zeros while font scan is loading', async () => {
    const { result } = await renderHook(() => useStorageTotals());
    expect(result.current).toEqual({
      audioBytes: 0,
      fontBytes: 0,
      tafsirBytes: 0,
      totalBytes: 0,
      loading: true,
    });
  });

  it('returns loading=false when font scan has settled', async () => {
    mockFont.mockReturnValue({ bytes: 0, loading: false });
    const { result } = await renderHook(() => useStorageTotals());
    expect(result.current.loading).toBe(false);
  });

  it('sums the three storage buckets', async () => {
    mockFont.mockReturnValue({ bytes: 3000, loading: false });
    mockAudio.mockReturnValue({ perReciter: [], totalBytes: 5000 });
    mockTafsir.mockReturnValue({ perTafsir: [], totalBytes: 2000 });
    const { result } = await renderHook(() => useStorageTotals());
    expect(result.current.totalBytes).toBe(10_000);
    expect(result.current.audioBytes).toBe(5000);
    expect(result.current.fontBytes).toBe(3000);
    expect(result.current.tafsirBytes).toBe(2000);
  });

  it('propagates loading from the font hook', async () => {
    mockFont.mockReturnValue({ bytes: 100, loading: true });
    mockAudio.mockReturnValue({ perReciter: [], totalBytes: 5000 });
    mockTafsir.mockReturnValue({ perTafsir: [], totalBytes: 2000 });
    const { result } = await renderHook(() => useStorageTotals());
    expect(result.current.loading).toBe(true);
    expect(result.current.totalBytes).toBe(7100);
  });
});
