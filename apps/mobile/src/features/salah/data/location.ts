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

export const getCoordinates = async (): Promise<{ lat: number; lng: number } | null> => {
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
    if (lastKnown && Date.now() - lastKnown.timestamp < 30 * 60 * 1000) {
      return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
    }

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: current.coords.latitude, lng: current.coords.longitude };
    } catch {
      // Simulator and some devices have no live GPS fix. A stale last-known
      // reading is still enough to compute a bearing; otherwise the empty state.
      if (lastKnown) {
        return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
      }
      return null;
    }
  } catch {
    return null;
  }
};

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
