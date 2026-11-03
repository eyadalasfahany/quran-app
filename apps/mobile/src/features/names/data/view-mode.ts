import { storage, storageKeys } from '@/core/storage/mmkv';

export type NamesViewMode = 'grid' | 'list';

export function readNamesViewMode(): NamesViewMode {
  const value = storage.getString(storageKeys.namesViewMode);
  return value === 'list' ? 'list' : 'grid';
}

export function writeNamesViewMode(mode: NamesViewMode): void {
  storage.set(storageKeys.namesViewMode, mode);
}
