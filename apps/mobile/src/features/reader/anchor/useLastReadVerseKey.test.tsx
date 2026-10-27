import { act, renderHook } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { useLastReadVerseKey } from './useLastReadVerseKey';

describe('useLastReadVerseKey', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerLastVerseKey);
  });

  it('starts at al-Fatihah when nothing is saved', async () => {
    const { result } = await renderHook(() => useLastReadVerseKey());

    expect(result.current).toBe('1:1');
  });

  it('follows every save the reader makes, so Home and the index never show a stale ayah', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    const { result } = await renderHook(() => useLastReadVerseKey());
    expect(result.current).toBe('2:255');

    await act(async () => {
      storage.set(storageKeys.readerLastVerseKey, '3:1');
    });

    expect(result.current).toBe('3:1');
  });
});
