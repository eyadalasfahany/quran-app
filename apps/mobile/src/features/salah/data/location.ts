import * as Location from 'expo-location';
import { storage, storageKeys } from '../../../core/storage/mmkv';

export type LocationSource = 'auto' | 'manual';

interface ManualLocation {
  id?: string;
  lat: number;
  lng: number;
}

export const getLocationPermissionStatus = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
};

export const requestLocationPermissions = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
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

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  try {
    let location = await Location.getLastKnownPositionAsync();
    if (location && (Date.now() - location.timestamp < 30 * 60 * 1000)) { // Use if less than 30 mins old
      return { lat: location.coords.latitude, lng: location.coords.longitude };
    }

    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  } catch (error) {
    console.error('Error getting location:', error);
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
