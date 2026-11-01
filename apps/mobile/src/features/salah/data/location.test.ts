import * as Location from 'expo-location';
import { getLocationPermissionStatus, requestLocationPermissions, getCoordinates, setManualLocation, setAutoLocation, getStoredLocationSource, getStoredManualCityId, LOCATION_FIX_TIMEOUT_MS } from '../data/location';
import { storage } from '../../../core/storage/mmkv';

// Mock expo-location wholesale — requireActual pulls in native expo-modules code.
jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', DENIED: 'denied', GRANTED: 'granted' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 34.0522, longitude: -118.2437, accuracy: 5, altitude: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
    timestamp: Date.now(),
  })),
}));

describe('location data module', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
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
    // Mock permission granted
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    const coords = await getCoordinates();
    expect(coords).toEqual({ lat: 34.0522, lng: -118.2437 });
  });

  it('should return null if permissions are not granted', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.DENIED });
    const coords = await getCoordinates();
    expect(coords).toBeNull();
  });

  it('falls back to last-known when the live GPS fix fails', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 60 * 60 * 1000,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('no fix'));

    await expect(getCoordinates()).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
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
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('no fix'));

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
      (Location.getCurrentPositionAsync as jest.Mock).mockReturnValueOnce(new Promise(() => undefined));

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

  it('lastKnownOnly returns the last known position, however old, and never asks the GPS for a fix', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 24.7136, longitude: 46.6753 },
      timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    });
    jest.mocked(Location.getCurrentPositionAsync).mockClear();

    await expect(getCoordinates({ lastKnownOnly: true })).resolves.toEqual({ lat: 24.7136, lng: 46.6753 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('lastKnownOnly is null when there is no last known position', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce(null);

    await expect(getCoordinates({ lastKnownOnly: true })).resolves.toBeNull();
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

    // Check if getCoordinates returns manual location
    const coords = await getCoordinates();
    expect(coords).toEqual({ lat: 1, lng: 2 });

    setAutoLocation();
    expect(getStoredLocationSource()).toBe('auto');
    // Check if getCoordinates returns auto location (mocked)
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: Location.PermissionStatus.GRANTED });
    const autoCoords = await getCoordinates();
    expect(autoCoords).toEqual({ lat: 34.0522, lng: -118.2437 });
  });
});
