import { storage, storageKeys } from '@/core/storage/mmkv';

import { readReaderMiniCollapsed, useReaderMiniCollapse } from './mini-bar-collapse';

describe('reader mini bar collapse', () => {
  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
  });

  it('writes the state to MMKV under reader.miniCollapsed', () => {
    expect(storageKeys.readerMiniCollapsed).toBe('reader.miniCollapsed');

    useReaderMiniCollapse.getState().setCollapsed(true);
    expect(storage.getBoolean(storageKeys.readerMiniCollapsed)).toBe(true);
    expect(useReaderMiniCollapse.getState().collapsed).toBe(true);
  });

  it('reads the remembered state back, so it holds across launches', () => {
    storage.set(storageKeys.readerMiniCollapsed, true);
    expect(readReaderMiniCollapsed()).toBe(true);

    storage.set(storageKeys.readerMiniCollapsed, false);
    expect(readReaderMiniCollapsed()).toBe(false);
  });

  it('starts expanded when nothing is remembered', () => {
    storage.remove(storageKeys.readerMiniCollapsed);
    expect(readReaderMiniCollapsed()).toBe(false);
  });
});
