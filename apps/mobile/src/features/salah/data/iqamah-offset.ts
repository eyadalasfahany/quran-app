import { storage, storageKeys } from '@/core/storage/mmkv';

/** Allowed iqamah offset values (minutes before prayer time). 0 is off (ADR 0056). */
export const IQAMAH_OFFSET_OPTIONS = [0, 5, 10, 15, 20, 30] as const;

export type IqamahOffsetMinutes = (typeof IQAMAH_OFFSET_OPTIONS)[number];

function isAllowedOffset(value: number): value is IqamahOffsetMinutes {
  return (IQAMAH_OFFSET_OPTIONS as readonly number[]).includes(value);
}

/** Absent or invalid stored values read as 0 (off). */
export function getIqamahOffsetMinutes(): IqamahOffsetMinutes {
  const stored = storage.getNumber(storageKeys.salah.iqamahOffsetMinutes);
  if (stored === undefined || !isAllowedOffset(stored)) {
    return 0;
  }
  return stored;
}

/** Persists only allowed values; others are ignored. */
export function setIqamahOffsetMinutes(minutes: number): void {
  if (!isAllowedOffset(minutes)) {
    return;
  }
  if (minutes === 0) {
    storage.remove(storageKeys.salah.iqamahOffsetMinutes);
    return;
  }
  storage.set(storageKeys.salah.iqamahOffsetMinutes, minutes);
}
