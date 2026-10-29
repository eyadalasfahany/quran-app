import { storage, storageKeys } from '@/core/storage/mmkv';

export type ReciterOption = { resourceId: number; installed: boolean };

/** The reciter the catalogue flags as the default (the API's `is_default`), or null when none is flagged. */
export function defaultReciterId(reciters: readonly { resourceId: number; isDefault: boolean }[]): number | null {
  return reciters.find((reciter) => reciter.isDefault)?.resourceId ?? null;
}

export function parseReciterId(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function readSavedReciterId(): number | null {
  return parseReciterId(storage.getString(storageKeys.audioReciterId));
}

export function writeSavedReciterId(id: number): void {
  storage.set(storageKeys.audioReciterId, String(id));
}

/**
 * The reciter to play: the saved choice if it is in the list, else the default, else the first installed
 * reciter, else the first one, else null.
 * `defaultId` is passed in by the caller, usually from `defaultReciterId`.
 */
export function resolveReciterId(
  saved: number | null,
  reciters: readonly ReciterOption[],
  defaultId: number | null,
): number | null {
  const listed = (id: number | null): id is number => id !== null && reciters.some((reciter) => reciter.resourceId === id);
  if (listed(saved)) {
    return saved;
  }
  if (listed(defaultId)) {
    return defaultId;
  }
  return reciters.find((reciter) => reciter.installed)?.resourceId ?? reciters[0]?.resourceId ?? null;
}
