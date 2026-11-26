import { storage, storageKeys } from '@/core/storage/mmkv';

import { drawnCollapsed, readReaderMiniCollapsed, setDrawnCollapsed, useReaderMiniCollapse } from './mini-bar-collapse';

describe('reader mini bar collapse', () => {
  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    useReaderMiniCollapse.getState().setShortOpen(false);
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

describe('short window collapse (ADR 0090 amendment, item 8)', () => {
  it('a short window starts collapsed whatever is saved, and opens only on the tap', () => {
    expect(drawnCollapsed(true, false, false)).toBe(true);
    expect(drawnCollapsed(true, true, false)).toBe(true);
    expect(drawnCollapsed(true, false, true)).toBe(false);
  });

  it('a tall window keeps the saved choice and ignores the short-window tap', () => {
    expect(drawnCollapsed(false, true, false)).toBe(true);
    expect(drawnCollapsed(false, false, true)).toBe(false);
  });

  it('collapsing or expanding in a short window does not change the saved choice', () => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    setDrawnCollapsed(true, false);
    expect(useReaderMiniCollapse.getState().shortOpen).toBe(true);
    expect(useReaderMiniCollapse.getState().collapsed).toBe(false);
    setDrawnCollapsed(true, true);
    expect(useReaderMiniCollapse.getState().shortOpen).toBe(false);
    expect(storage.getBoolean(storageKeys.readerMiniCollapsed)).toBe(false);
  });

  it('collapsing in a tall window saves the choice', () => {
    setDrawnCollapsed(false, true);
    expect(useReaderMiniCollapse.getState().collapsed).toBe(true);
    expect(storage.getBoolean(storageKeys.readerMiniCollapsed)).toBe(true);
  });
});
