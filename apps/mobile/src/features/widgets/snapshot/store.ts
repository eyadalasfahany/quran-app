import { storage, storageKeys } from '@/core/storage/mmkv';

import { parseWidgetSnapshot } from './select';
import type { WidgetSnapshotWriter } from './publish';
import type { WidgetSnapshot } from './types';

/** The raw stored JSON, or undefined when none is stored. The sync compares it, so it is not parsed. */
export function readWidgetSnapshotJson(): string | undefined {
  return storage.getString(storageKeys.widgets.snapshot);
}

/** The stored snapshot, or null when it is missing, unreadable or another schema version. */
export function readWidgetSnapshot(): WidgetSnapshot | null {
  return parseWidgetSnapshot(readWidgetSnapshotJson());
}

/** Stores the snapshot's JSON as given. The MMKV writer uses it, so every target gets the same bytes. */
export function writeWidgetSnapshotJson(json: string): void {
  storage.set(storageKeys.widgets.snapshot, json);
}

export function writeWidgetSnapshot(snapshot: WidgetSnapshot): void {
  writeWidgetSnapshotJson(JSON.stringify(snapshot));
}

/** Removes the snapshot. Clear-data calls it; the widgets then show the open-the-app state. */
export function clearWidgetSnapshot(): void {
  storage.remove(storageKeys.widgets.snapshot);
}

/**
 * The app's canonical copy of the snapshot (MMKV). Always written first: the sync compares it, the Android headless
 * task reads it, and a target with no store of its own (Android) draws from it.
 */
export const mmkvWidgetWriter: WidgetSnapshotWriter = {
  id: 'mmkv',
  write: writeWidgetSnapshotJson,
};
