import { storage } from '@/core/storage/mmkv';

/**
 * What a schedule of local notifications was computed for. A prayer-relative time depends on the local day, the time
 * zone and the coordinates (`timesFor` is recomputed on every sync), so any change to one of them needs a resync.
 * Shared by the Azkar reminders (ADR 0031 §7) and the Salah prayer notifications (ADR 0030 §3).
 */
export type ScheduleSyncState = {
  /** The local calendar day, `YYYY-MM-DD`. */
  day: string;
  timeZone: string;
  coordsKey: string;
};

export type SyncCoordinates = { lat: number; lng: number };

/**
 * Coordinates are compared to two decimals (about 1 km). Prayer times move by seconds over that distance, and a
 * GPS fix that jitters by metres must not trigger a resync on every return to the app.
 */
export function coordsKey(coords: SyncCoordinates | null): string {
  if (coords === null) {
    return 'none';
  }
  return `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
}

/** The local calendar day of `date`, as `YYYY-MM-DD`. */
export function localDay(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentSyncState(now: Date, coords: SyncCoordinates | null): ScheduleSyncState {
  return {
    day: localDay(now),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    coordsKey: coordsKey(coords),
  };
}

/** True when the date, the time zone or the coordinates changed since `previous`, or nothing was synced yet. */
export function needsResync(previous: ScheduleSyncState | null, current: ScheduleSyncState): boolean {
  if (previous === null) {
    return true;
  }
  return (
    previous.day !== current.day || previous.timeZone !== current.timeZone || previous.coordsKey !== current.coordsKey
  );
}

function isSyncState(value: unknown): value is ScheduleSyncState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.day === 'string' &&
    typeof candidate.timeZone === 'string' &&
    typeof candidate.coordsKey === 'string'
  );
}

/** The last recorded sync under `key`, or null when none is recorded or the stored value is unreadable. */
export function readSyncState(key: string): ScheduleSyncState | null {
  const raw = storage.getString(key);
  if (raw === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSyncState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSyncState(key: string, state: ScheduleSyncState): void {
  storage.set(key, JSON.stringify(state));
}
