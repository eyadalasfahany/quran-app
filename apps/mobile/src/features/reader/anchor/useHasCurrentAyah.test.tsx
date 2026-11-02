import { act, renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { useHasCurrentAyah } from './useHasCurrentAyah';

beforeEach(() => {
  storage.remove(storageKeys.readerLastVerseKey);
});

describe('useHasCurrentAyah', () => {
  it('is false on a fresh install, with nothing read', async () => {
    const { result } = await renderHook(() => useHasCurrentAyah());

    expect(result.current).toBe(false);
  });

  it('is true once an ayah is saved as the current one', async () => {
    const { result } = await renderHook(() => useHasCurrentAyah());

    await act(() => {
      storage.set(storageKeys.readerLastVerseKey, '1:1');
    });

    expect(result.current).toBe(true);
  });
});
