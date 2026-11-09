import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  effectiveIqamahOffsetMinutes,
  getIqamahOffsetMinutes,
  IQAMAH_OFFSET_OPTIONS,
  setIqamahOffsetMinutes,
} from './iqamah-offset';

describe('iqamah offset (MMKV)', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('defaults to off when absent', () => {
    expect(getIqamahOffsetMinutes()).toBe(0);
  });

  it('round-trips allowed positive values', () => {
    for (const minutes of IQAMAH_OFFSET_OPTIONS) {
      if (minutes === 0) {
        continue;
      }
      setIqamahOffsetMinutes(minutes);
      expect(getIqamahOffsetMinutes()).toBe(minutes);
    }
  });

  it('removes the key when set to zero', () => {
    setIqamahOffsetMinutes(20);
    setIqamahOffsetMinutes(0);
    expect(getIqamahOffsetMinutes()).toBe(0);
    expect(storage.getNumber(storageKeys.salah.iqamahOffsetMinutes)).toBeUndefined();
  });

  it('coerces invalid stored values to 0 on read', () => {
    storage.set(storageKeys.salah.iqamahOffsetMinutes, 7);
    expect(getIqamahOffsetMinutes()).toBe(0);

    storage.set(storageKeys.salah.iqamahOffsetMinutes, 99);
    expect(getIqamahOffsetMinutes()).toBe(0);
  });

  it('ignores disallowed writes', () => {
    setIqamahOffsetMinutes(12);
    expect(getIqamahOffsetMinutes()).toBe(0);
    expect(storage.getNumber(storageKeys.salah.iqamahOffsetMinutes)).toBeUndefined();
  });

  it('paused: the effective offset is 0 even when 10 is stored, and the stored value is kept', () => {
    setIqamahOffsetMinutes(10);
    expect(effectiveIqamahOffsetMinutes()).toBe(0);
    expect(getIqamahOffsetMinutes()).toBe(10);
  });
});
