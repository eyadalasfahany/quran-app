import * as Location from 'expo-location';
import {
  getLocationPermissionStatus,
  requestLocationPermissions,
  getCoordinates,
  setManualLocation,
  setAutoLocation,
  getStoredLocationSource,
  getStoredManualCityId,
  LOCATION_FIX_TIMEOUT_MS,
  LAST_KNOWN_FRESH_MS,
  LAST_KNOWN_MAX_AGE_MS,
} from './location';
import { storage } from '../../../core/storage/mmkv';

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', DENIED: 'denied', GRANTED: 'granted' },
  Accuracy: { Lowest: 1, Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 34.0522, longitude: -118.2437, accuracy: 5, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
    timestamp: Date.now(),
  })),
  enableNetworkProviderAsync: jest.fn(() => Promise.resolve()),
}));

describe('location data module', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(Location.getCurrentPositionAsync).mockImplementation(() =>
      Promise.resolve({
        coords: { latitude: 34.0522, longitude: -118.2437, accuracy: 5, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
        timestamp: Date.now(),
      }),
    );
  });

  it('should return permission status', async () => {
    const status = await getLocationPermissionStatus();
    expect(status).toBe(Location.PermissionStatus.UNDETERMINED);
  });

  it('should request permissions', async () => {
    const status = await requestLocationPermissions();
    expect(status).toBe(Location.PermissionStatus.GRANTED);
  });

  it('should get current coordinates after granting permission', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    const coords = await getCoordinates();
    expect(coords).toEqual({ lat: 34.0522, lng: -118.2437 });
  });

  it('should return null if permissions are not granted', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.DENIED });
    const coords = await getCoordinates();
    expect(coords).toBeNull();
  });

  it('uses a fresh last-known fix without asking the GPS for a live fix', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - (LAST_KNOWN_FRESH_MS - 60_000),
    });
    jest.mocked(Location.getCurrentPositionAsync).mockClear();

    await expect(getCoordinates()).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back to last-known when the live GPS fix fails', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 60 * 60 * 1000,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('no fix'));

    await expect(getCoordinates()).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
  });

  it('asks the GPS for a live fix when the last-known fix is an hour old', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 60 * 60 * 1000,
    });

    await expect(getCoordinates()).resolves.toEqual({ lat: 34.0522, lng: -118.2437 });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
  });

  it('returns null when the live fix fails and the last-known fix is two days old', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 2 * LAST_KNOWN_MAX_AGE_MS,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('no fix'));

    await expect(getCoordinates()).resolves.toBeNull();
  });

  it('treats a missing permission payload as undetermined, not a throw', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(getLocationPermissionStatus()).resolves.toBe(Location.PermissionStatus.UNDETERMINED);
  });

  it('returns null when GPS is unavailable and there is no last-known', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce(null);
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('no fix'));

    await expect(getCoordinates()).resolves.toBeNull();
  });

  it('gives up on a live fix that takes longer than the timeout and uses the last known position', async () => {
    jest.useFakeTimers();
    try {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
      (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { latitude: 24.7136, longitude: 46.6753 },
        timestamp: Date.now() - 60 * 60 * 1000,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => undefined));

      const pendingCoords = getCoordinates();
      await jest.advanceTimersByTimeAsync(LOCATION_FIX_TIMEOUT_MS + 1);

      await expect(pendingCoords).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses a live fix that arrives inside the timeout', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce(null);

    await expect(getCoordinates()).resolves.toEqual({ lat: 34.0522, lng: -118.2437 });
  });

  it('lastKnownOnly returns a last-known position within max age and never asks the GPS for a fix', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 5 * 60 * 60 * 1000,
    });
    jest.mocked(Location.getCurrentPositionAsync).mockClear();

    await expect(getCoordinates({ lastKnownOnly: true })).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('lastKnownOnly is null when the last-known fix is older than max age', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 2 * LAST_KNOWN_MAX_AGE_MS,
    });

    await expect(getCoordinates({ lastKnownOnly: true })).resolves.toBeNull();
  });

  it('lastKnownOnly is null when there is no last known position', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce(null);

    await expect(getCoordinates({ lastKnownOnly: true })).resolves.toBeNull();
  });

  it('never calls enableNetworkProviderAsync', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    await getCoordinates();
    expect(Location.enableNetworkProviderAsync).not.toHaveBeenCalled();
  });

  it('manual location round-trips through MMKV', () => {
    setManualLocation({ id: 'dubai', lat: 25.2048, lng: 55.2708 });
    expect(getStoredLocationSource()).toBe('manual');
    expect(getStoredManualCityId()).toBe('dubai');
  });

  it('manual overrides auto', async () => {
    setAutoLocation();
    expect(getStoredLocationSource()).toBe('auto');

    setManualLocation({ lat: 1, lng: 2 });
    expect(getStoredLocationSource()).toBe('manual');

    const coords = await getCoordinates();
    expect(coords).toEqual({ lat: 1, lng: 2 });

    setAutoLocation();
    expect(getStoredLocationSource()).toBe('auto');
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    const autoCoords = await getCoordinates();
    expect(autoCoords).toEqual({ lat: 34.0522, lng: -118.2437 });
  });
});
