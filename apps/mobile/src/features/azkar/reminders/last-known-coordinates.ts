import * as Location from 'expo-location';

import { storage, storageKeys } from '@/core/storage/mmkv';

import type { Coordinates } from './schedule';

/**
 * The coordinates a foreground check may use, without asking the device for a fix: the saved manual city, else the
 * last known GPS position (of any age). Only the explicit sync (app start, a reminder edit) reads a live fix through
 * `getCoordinates` in the Salah location module. Errors resolve to null, so a check never throws into the UI.
 */
export async function readLastKnownCoordinates(): Promise<Coordinates | null> {
  const source = storage.getString(storageKeys.salah.locationSource);
  if (source === 'manual') {
    const lat = storage.getNumber(storageKeys.salah.manualLat);
    const lng = storage.getNumber(storageKeys.salah.manualLng);
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return null;
    }
    const lastKnown = await Location.getLastKnownPositionAsync();
    return lastKnown ? { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude } : null;
  } catch {
    return null;
  }
}
