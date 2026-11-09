import * as Location from 'expo-location';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getCoordinates, getLocationPermissionStatus, setManualLocation, setAutoLocation } from './location';
import {
  invalidatePrayerLocation,
  LOCATION_CACHE_TTL_MS,
  loadPrayerLocation,
  peekPrayerLocation,
  reloadPrayerLocation,
  seedPrayerLocation,
} from './location-cache';

jest.mock('./location', () => ({
  ...jest.requireActual<typeof import('./location')>('./location'),
  getCoordinates: jest.fn(),
  getLocationPermissionStatus: jest.fn(),
}));

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const MAKKAH = { lat: 21.4225, lng: 39.8262 };

let clock = 1_000_000;

describe('prayer location cache', () => {
  beforeEach(() => {
    storage.clearAll();
    invalidatePrayerLocation();
    jest.clearAllMocks();
    clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
    setAutoLocation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads once and serves the next consumer from the cache inside the TTL', async () => {
    const first = await loadPrayerLocation();
    tick(LOCATION_CACHE_TTL_MS - 1);
    const second = await loadPrayerLocation();

    expect(getCoordinates).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first).toMatchObject({ source: 'auto', coords: RIYADH, permissionStatus: Location.PermissionStatus.GRANTED });
  });

  it('shares one read between consumers that ask at the same time', async () => {
    const [a, b, c] = await Promise.all([loadPrayerLocation(), loadPrayerLocation(), loadPrayerLocation()]);

    expect(getCoordinates).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('reads again once the TTL has passed', async () => {
    await loadPrayerLocation();
    tick(LOCATION_CACHE_TTL_MS);
    await loadPrayerLocation();

    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('peek is synchronous and empty until a read has landed', async () => {
    expect(peekPrayerLocation()).toBeNull();

    await loadPrayerLocation();
    expect(peekPrayerLocation()).not.toBeNull();
  });

  it('invalidation drops the snapshot, so the next load reads fresh', async () => {
    await loadPrayerLocation();
    invalidatePrayerLocation();
    expect(peekPrayerLocation()).toBeNull();

    await loadPrayerLocation();
    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('a read that was in flight when the cache was invalidated does not write its stale result back', async () => {
    let resolveFirst: (value: { lat: number; lng: number }) => void = () => undefined;
    jest.mocked(getCoordinates).mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));

    const stale = loadPrayerLocation();
    // The permission check comes first; the coordinates read (and its resolver) only starts after it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    invalidatePrayerLocation();
    resolveFirst(RIYADH);
    await stale;

    expect(peekPrayerLocation()).toBeNull();
  });

  it('a changed location choice (a manual city) is a cache miss at once', async () => {
    await loadPrayerLocation();
    setManualLocation({ id: 'makkah', lat: MAKKAH.lat, lng: MAKKAH.lng });

    expect(peekPrayerLocation()).toBeNull();
    jest.mocked(getCoordinates).mockResolvedValue(MAKKAH);
    const manual = await loadPrayerLocation();

    expect(manual).toMatchObject({ source: 'manual', cityId: 'makkah', coords: MAKKAH });
    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('a manual city snapshot carries the city name for the screen', async () => {
    setManualLocation({ id: 'makkah', lat: MAKKAH.lat, lng: MAKKAH.lng });
    jest.mocked(getCoordinates).mockResolvedValue(MAKKAH);

    const snapshot = await loadPrayerLocation();

    expect(snapshot.cityName).toBeDefined();
    expect(snapshot.cityName?.ar).toEqual(expect.any(String));
  });

  it('reads the stored choice, so an auto snapshot has no city', async () => {
    setAutoLocation();
    const snapshot = await loadPrayerLocation();

    expect(snapshot.source).toBe('auto');
    expect(snapshot.cityName).toBeUndefined();
    expect(storage.getString(storageKeys.salah.locationSource)).toBe('auto');
  });

  it('reloadPrayerLocation re-reads when a fresh entry exists', async () => {
    await loadPrayerLocation();
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    await reloadPrayerLocation();

    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('two concurrent reloadPrayerLocation calls share one read', async () => {
    await loadPrayerLocation();
    jest.mocked(getCoordinates).mockClear();

    await Promise.all([reloadPrayerLocation(), reloadPrayerLocation()]);

    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  function tick(ms: number) {
    clock += ms;
  }
});

describe('prayer location cache: last known place (ADR 0086)', () => {
  beforeEach(() => {
    storage.clearAll();
    invalidatePrayerLocation();
    jest.clearAllMocks();
    clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    setAutoLocation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('carries stale false for a fresh fix', async () => {
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
    await expect(loadPrayerLocation()).resolves.toMatchObject({ coords: RIYADH, stale: false });
  });

  it('carries stale true when the fix is missing and a saved place is used', async () => {
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');
    jest.mocked(getCoordinates).mockResolvedValue(null);

    await expect(loadPrayerLocation()).resolves.toMatchObject({ coords: { lat: 24.71, lng: 46.68 }, stale: true });
  });

  it('a save of the last place does not invalidate the cached snapshot', async () => {
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
    const first = await loadPrayerLocation();

    storage.set(storageKeys.salah.lastAutoCoords, '21.42,39.83');

    expect(peekPrayerLocation()).toBe(first);
  });

  it('seeds the first render from the saved place, marked stale and undetermined', () => {
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');

    expect(seedPrayerLocation()).toEqual({
      source: 'auto',
      coords: { lat: 24.71, lng: 46.68 },
      stale: true,
      permissionStatus: Location.PermissionStatus.UNDETERMINED,
    });
  });

  it('does not seed a manual choice or a first-time user with nothing saved', () => {
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');
    setManualLocation({ id: 'makkah', lat: 21.4225, lng: 39.8262 });
    expect(seedPrayerLocation()).toBeNull();

    setAutoLocation();
    storage.remove(storageKeys.salah.lastAutoCoords);
    expect(seedPrayerLocation()).toBeNull();
  });
});
