import { storage, storageKeys } from '@/core/storage/mmkv';

import { clearWidgetSnapshot, readWidgetSnapshot, writeWidgetSnapshot } from './store';
import { fullSnapshot } from './test-fixtures';
import { withMisbaha } from './patch';

describe('widget snapshot store', () => {
  beforeEach(() => storage.remove(storageKeys.widgets.snapshot));

  it('returns null before anything is written', () => {
    expect(readWidgetSnapshot()).toBeNull();
  });

  it('writes and reads back under the widget key', () => {
    writeWidgetSnapshot(fullSnapshot());
    expect(readWidgetSnapshot()).toEqual(fullSnapshot());
    expect(storage.getString(storageKeys.widgets.snapshot)).toBeDefined();
  });

  it('clears the snapshot', () => {
    writeWidgetSnapshot(fullSnapshot());
    clearWidgetSnapshot();
    expect(readWidgetSnapshot()).toBeNull();
  });

  it('replaces only the misbaha block when a tap patches the snapshot', () => {
    const patched = withMisbaha(fullSnapshot(), { count: 0, target: 100, todayTotal: 151 });
    expect(patched.misbaha).toEqual({ count: 0, target: 100, todayTotal: 151 });
    expect(patched.progress).toEqual(fullSnapshot().progress);
  });
});
