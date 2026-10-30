import { storage, storageKeys } from '@/core/storage/mmkv';

import { readDailyReminder, writeDailyReminder } from './reminder-preference';

describe('daily reminder preference', () => {
  beforeEach(() => {
    storage.remove(storageKeys.dailyReminder);
  });

  it('defaults to off when unset', () => {
    expect(readDailyReminder()).toBe(false);
  });

  it('persists the toggle in MMKV', () => {
    writeDailyReminder(true);

    expect(storage.getBoolean(storageKeys.dailyReminder)).toBe(true);
    expect(readDailyReminder()).toBe(true);

    writeDailyReminder(false);

    expect(readDailyReminder()).toBe(false);
  });
});
