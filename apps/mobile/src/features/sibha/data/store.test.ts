import { storage, storageKeys } from '@/core/storage/mmkv';

import { DEFAULT_SIBHA_STATE } from './model';
import { addSibhaTodayTap, readSibhaState, readSibhaTodayTotal, recordSibhaTap, saveSibhaState } from './store';

// Local noon, so the local date is the same on every machine.
const day1 = new Date(2026, 10, 1, 12, 0, 0);
const day2 = new Date(2026, 10, 2, 12, 0, 0);

describe('misbaha store', () => {
  beforeEach(() => {
    storage.remove(storageKeys.sibha.state);
    storage.remove(storageKeys.sibha.today);
  });

  it('starts from the default counter and no taps today', () => {
    expect(readSibhaState()).toEqual(DEFAULT_SIBHA_STATE);
    expect(readSibhaTodayTotal(day1)).toBe(0);
  });

  it('persists the count, target and label across reads', () => {
    saveSibhaState({ count: 7, label: 'تسمية تجريبية', target: 33 });

    expect(readSibhaState()).toEqual({ count: 7, label: 'تسمية تجريبية', target: 33 });
  });

  it('counts each tap into the saved counter and into today’s total', () => {
    saveSibhaState({ count: 0, label: '', target: 3 });

    expect(recordSibhaTap(day1)).toMatchObject({ reachedTarget: false, todayTotal: 1, state: { count: 1, target: 3 } });
    recordSibhaTap(day1);
    expect(recordSibhaTap(day1)).toMatchObject({ reachedTarget: true, todayTotal: 3, state: { count: 3 } });
    expect(readSibhaState().count).toBe(3);
    expect(readSibhaTodayTotal(day1)).toBe(3);
  });

  it('starts today’s total again on a new local date, and keeps the count', () => {
    saveSibhaState({ count: 40, label: '', target: 100 });
    addSibhaTodayTap(day1);
    addSibhaTodayTap(day1);

    expect(readSibhaTodayTotal(day2)).toBe(0);
    expect(addSibhaTodayTap(day2)).toBe(1);
    expect(readSibhaState().count).toBe(40);
  });
});
