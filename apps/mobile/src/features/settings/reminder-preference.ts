import { storage, storageKeys } from '@/core/storage/mmkv';

export function readDailyReminder(): boolean {
  return storage.getBoolean(storageKeys.dailyReminder) ?? false;
}

export function writeDailyReminder(on: boolean): void {
  storage.set(storageKeys.dailyReminder, on);
}
