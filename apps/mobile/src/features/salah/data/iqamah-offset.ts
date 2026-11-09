import { storage, storageKeys } from '@/core/storage/mmkv';

/** Allowed iqamah offset values (minutes after adhan / prayer time). 0 is off (ADR 0056). */
export const IQAMAH_OFFSET_OPTIONS = [0, 5, 10, 15, 20, 30] as const;

export type IqamahOffsetMinutes = (typeof IQAMAH_OFFSET_OPTIONS)[number];

/** Iqamah notifications are paused (developer, 9 Nov 2026; ADR 0056 amendment). Flip to true, and restore
 * `<IqamahOffsetRow />` in Settings, to bring them back. */
export const IQAMAH_ENABLED = false;

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

/** The offset scheduling uses: the stored offset while iqamah is enabled, else 0 (off). */
export function effectiveIqamahOffsetMinutes(): IqamahOffsetMinutes {
  return IQAMAH_ENABLED ? getIqamahOffsetMinutes() : 0;
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
