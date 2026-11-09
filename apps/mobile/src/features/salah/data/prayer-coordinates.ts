import { storage, storageKeys } from '@/core/storage/mmkv';
import { coordsFromKey, coordsKey, readSyncState, type SyncCoordinates } from '@/features/notifications/sync-state';

import { getCoordinates, getStoredLocationSource, type CoordinatesOptions } from './location';

/**
 * The one fallback every prayer consumer shares (ADR 0086). `getCoordinates` stays fresh-or-null. Here, a missing fix
 * uses the last automatic place, then the last prayer sync's coordinates (a backstop for installs from before the saved
 * place), and says so through `stale`.
 */

/** The last automatic fix, kept at two decimals (about 1 km) and written only when it changes. */
function savedAutoCoords(): SyncCoordinates | null {
  return coordsFromKey(storage.getString(storageKeys.salah.lastAutoCoords));
}

function lastSyncCoords(): SyncCoordinates | null {
  return coordsFromKey(readSyncState(storageKeys.salah.notificationsSync)?.coordsKey);
}

/** The saved coordinates for a first render, without a fresh read. */
export function savedPrayerCoordinates(): SyncCoordinates | null {
  return savedAutoCoords() ?? lastSyncCoords();
}

export async function resolvePrayerCoordinates(
  options: CoordinatesOptions = {},
): Promise<{ coords: SyncCoordinates | null; stale: boolean }> {
  const coords = await getCoordinates(options);
  if (coords !== null) {
    if (getStoredLocationSource() === 'auto') {
      const next = coordsKey(coords);
      if (storage.getString(storageKeys.salah.lastAutoCoords) !== next) {
        storage.set(storageKeys.salah.lastAutoCoords, next);
      }
    }
    return { coords, stale: false };
  }
  const fallback = savedPrayerCoordinates();
  return { coords: fallback, stale: fallback !== null };
}
