import * as Location from 'expo-location';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { readLastKnownCoordinates } from './last-known-coordinates';

describe('readLastKnownCoordinates', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: Location.PermissionStatus.GRANTED } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({
      coords: { latitude: 51.5, longitude: -0.12 },
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    } as never);
  });

  it('returns the saved manual city and reads no device location', async () => {
    storage.set(storageKeys.salah.locationSource, 'manual');
    storage.set(storageKeys.salah.manualLat, 21.42);
    storage.set(storageKeys.salah.manualLng, 39.83);

    await expect(readLastKnownCoordinates()).resolves.toEqual({ lat: 21.42, lng: 39.83 });
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('returns the last known GPS position, of any age, without asking for a new fix', async () => {
    await expect(readLastKnownCoordinates()).resolves.toEqual({ lat: 51.5, lng: -0.12 });
    expect(Location.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('returns null without permission, and reads nothing', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({ status: Location.PermissionStatus.DENIED } as never);

    await expect(readLastKnownCoordinates()).resolves.toBeNull();
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('returns null when there is no last known position', async () => {
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValueOnce(null);

    await expect(readLastKnownCoordinates()).resolves.toBeNull();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when the location module fails', async () => {
    jest.mocked(Location.getLastKnownPositionAsync).mockRejectedValueOnce(new Error('native module'));

    await expect(readLastKnownCoordinates()).resolves.toBeNull();
  });
});
