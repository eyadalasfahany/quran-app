import * as Location from 'expo-location';
import { storage, storageKeys } from '../../../core/storage/mmkv';

export type LocationSource = 'auto' | 'manual';

interface ManualLocation {
  id?: string;
  lat: number;
  lng: number;
}

export const getLocationPermissionStatus = async () => {
  try {
    const result = await Location.getForegroundPermissionsAsync();
    return result?.status ?? Location.PermissionStatus.UNDETERMINED;
  } catch {
    return Location.PermissionStatus.UNDETERMINED;
  }
};

export const requestLocationPermissions = async () => {
  try {
    const result = await Location.requestForegroundPermissionsAsync();
    return result?.status ?? Location.PermissionStatus.DENIED;
  } catch {
    return Location.PermissionStatus.DENIED;
  }
};

/** A live GPS fix that takes longer than this is abandoned, so a slow fix never holds up the screen or a sync. */
export const LOCATION_FIX_TIMEOUT_MS = 15_000;

/** A last-known fix younger than this is used without asking the GPS for a live fix. */
export const LAST_KNOWN_FRESH_MS = 5 * 60 * 1000;

/** A last-known fix older than this is never used; it may be from another city. */
export const LAST_KNOWN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CoordinatesOptions = {
  /** Use the last known position and never ask the GPS for a fix (the foreground check). */
  lastKnownOnly?: boolean;
};

/** Rejects if `promise` has not settled within `ms`; the timer is cleared as soon as it settles. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const getCoordinates = async (options: CoordinatesOptions = {}): Promise<{ lat: number; lng: number } | null> => {
  const source = storage.getString(storageKeys.salah.locationSource) as LocationSource | undefined;

  if (source === 'manual') {
    const manualLat = storage.getNumber(storageKeys.salah.manualLat);
    const manualLng = storage.getNumber(storageKeys.salah.manualLng);
    if (manualLat !== undefined && manualLng !== undefined) {
      return { lat: manualLat, lng: manualLng };
    }
  }

  const status = await getLocationPermissionStatus();
  if (status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    const usable =
      lastKnown && Date.now() - lastKnown.timestamp < LAST_KNOWN_MAX_AGE_MS ? lastKnown : null;

    if (options.lastKnownOnly) {
      return usable ? { lat: usable.coords.latitude, lng: usable.coords.longitude } : null;
    }

    if (lastKnown && Date.now() - lastKnown.timestamp < LAST_KNOWN_FRESH_MS) {
      return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
    }

    const live = await readLiveCoordinates();
    if (live) {
      return live;
    }

    if (usable) {
      return { lat: usable.coords.latitude, lng: usable.coords.longitude };
    }
    return null;
  } catch {
    return null;
  }
};

async function readLiveCoordinates(): Promise<{ lat: number; lng: number } | null> {
  try {
    const request = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const current = await withTimeout(request, LOCATION_FIX_TIMEOUT_MS);
    return { lat: current.coords.latitude, lng: current.coords.longitude };
  } catch {
    return null;
  }
}

export const setManualLocation = (location: ManualLocation) => {
  storage.set(storageKeys.salah.locationSource, 'manual');
  if (location.id) {
    storage.set(storageKeys.salah.manualCityId, location.id);
  } else {
    storage.remove(storageKeys.salah.manualCityId);
  }
  storage.set(storageKeys.salah.manualLat, location.lat);
  storage.set(storageKeys.salah.manualLng, location.lng);
};

export const setAutoLocation = () => {
  storage.set(storageKeys.salah.locationSource, 'auto');
  storage.remove(storageKeys.salah.manualCityId);
  storage.remove(storageKeys.salah.manualLat);
  storage.remove(storageKeys.salah.manualLng);
};

export const getStoredLocationSource = (): LocationSource => {
  return (storage.getString(storageKeys.salah.locationSource) as LocationSource) || 'auto';
};

export const getStoredManualCityId = (): string | undefined => {
  return storage.getString(storageKeys.salah.manualCityId) || undefined;
};
