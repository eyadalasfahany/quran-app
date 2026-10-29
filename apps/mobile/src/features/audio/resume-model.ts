import { storage, storageKeys } from '@/core/storage/mmkv';

import { isChapterId } from './playerStore';

export type LastPosition = { reciterId: number | null; chapterId: number; positionMs: number };

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

/** Parses the saved resume state. Anything malformed becomes null, so nothing is restored. */
export function parseLastPosition(raw: string | undefined): LastPosition | null {
  if (raw === undefined) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const { reciterId, chapterId, positionMs } = record;
  const validReciter = reciterId === null || isPositiveInteger(reciterId);
  if (!validReciter || !isChapterId(chapterId) || !isNonNegativeInteger(positionMs)) {
    return null;
  }
  return { reciterId: reciterId ?? null, chapterId, positionMs };
}

export function readLastPosition(): LastPosition | null {
  return parseLastPosition(storage.getString(storageKeys.audioLastPosition));
}

export function writeLastPosition(position: LastPosition): void {
  storage.set(storageKeys.audioLastPosition, JSON.stringify(position));
}
