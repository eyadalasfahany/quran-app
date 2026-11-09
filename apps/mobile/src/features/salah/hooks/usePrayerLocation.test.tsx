import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AppState, type AppStateStatus } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getCoordinates, getLocationPermissionStatus, setAutoLocation, setManualLocation } from '../data/location';
import { invalidatePrayerLocation, LOCATION_CACHE_TTL_MS } from '../data/location-cache';
import { usePrayerLocation } from './index';

jest.mock('../data/location', () => ({
  ...jest.requireActual<typeof import('../data/location')>('../data/location'),
  getCoordinates: jest.fn(),
  getLocationPermissionStatus: jest.fn(),
}));

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const JEDDAH = { lat: 21.5433, lng: 39.1728 };

describe('usePrayerLocation', () => {
  const appStateHandlers: ((state: AppStateStatus) => void)[] = [];
  let clock = 1_000_000;

  function fireAppStateActive() {
    for (const handler of appStateHandlers) {
      handler('active');
    }
  }

  beforeEach(() => {
    storage.clearAll();
    invalidatePrayerLocation();
    jest.clearAllMocks();
    appStateHandlers.length = 0;
    clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    setAutoLocation();
    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandlers.push(handler);
      return { remove: jest.fn() } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is pending until the first read lands, then holds the coordinates', async () => {
    // The first read is held open, so the screen can be seen while it is still pending.
    let landRead: (value: { lat: number; lng: number }) => void = () => undefined;
    jest.mocked(getCoordinates).mockImplementationOnce(() => new Promise((resolve) => (landRead = resolve)));

    const { result } = await renderHook(() => usePrayerLocation());

    expect(result.current.pending).toBe(true);
    expect(result.current.coords).toBeNull();

    await act(async () => {
      landRead(RIYADH);
    });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.coords).toEqual(RIYADH);
  });

  it('two consumers mounted together share one permission check and one coordinates read', async () => {
    const first = await renderHook(() => usePrayerLocation());
    const second = await renderHook(() => usePrayerLocation());

    await waitFor(() => expect(first.result.current.pending).toBe(false));
    await waitFor(() => expect(second.result.current.pending).toBe(false));
    expect(getCoordinates).toHaveBeenCalledTimes(1);
    expect(getLocationPermissionStatus).toHaveBeenCalledTimes(1);
  });

  it('a consumer that mounts inside the TTL does not read again', async () => {
    const first = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(first.result.current.pending).toBe(false));

    const later = await renderHook(() => usePrayerLocation());

    expect(later.result.current.pending).toBe(false);
    expect(later.result.current.coords).toEqual(RIYADH);
    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  it('re-reads location when the app returns to the foreground after permission was denied', async () => {
    jest.mocked(getLocationPermissionStatus).mockResolvedValueOnce(Location.PermissionStatus.DENIED);
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);

    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.coords).toBeNull();
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);

    await act(async () => {
      fireAppStateActive();
    });
    await waitFor(() => expect(result.current.coords).toEqual(RIYADH));
    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('does not re-read on foreground when automatic location already has coordinates', async () => {
    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireAppStateActive();
    });

    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  it('re-reads on foreground once the cached location is older than the TTL', async () => {
    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    clock += LOCATION_CACHE_TTL_MS;
    jest.mocked(getCoordinates).mockResolvedValueOnce(JEDDAH);

    await act(async () => {
      fireAppStateActive();
    });
    await waitFor(() => expect(result.current.coords).toEqual(JEDDAH));
    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });

  it('two mounted consumers share one read on foreground', async () => {
    const first = await renderHook(() => usePrayerLocation());
    const second = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(first.result.current.pending).toBe(false));
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    clock += LOCATION_CACHE_TTL_MS;
    jest.mocked(getCoordinates).mockClear();

    await act(async () => {
      fireAppStateActive();
    });
    await waitFor(() => expect(second.result.current.coords).toEqual(RIYADH));
    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  it('manual source never re-reads on foreground', async () => {
    setManualLocation({ id: 'makkah', lat: 21.4225, lng: 39.8262 });
    invalidatePrayerLocation();
    jest.mocked(getCoordinates).mockResolvedValue({ lat: 21.4225, lng: 39.8262 });

    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    clock += LOCATION_CACHE_TTL_MS;

    await act(async () => {
      fireAppStateActive();
    });

    expect(getCoordinates).toHaveBeenCalledTimes(1);
  });

  it('refresh drops the cache, reads again, and returns a promise that settles', async () => {
    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.pending).toBe(false));

    jest.mocked(getCoordinates).mockResolvedValue({ lat: 21.4225, lng: 39.8262 });
    await act(async () => {
      await result.current.refresh();
    });

    expect(getCoordinates).toHaveBeenCalledTimes(2);
    expect(result.current.coords).toEqual({ lat: 21.4225, lng: 39.8262 });
    expect(result.current.pending).toBe(false);
  });
});

describe('usePrayerLocation with the saved last place (ADR 0086)', () => {
  const appStateHandlers: ((state: AppStateStatus) => void)[] = [];
  let clock = 2_000_000;

  beforeEach(() => {
    storage.clearAll();
    invalidatePrayerLocation();
    jest.clearAllMocks();
    appStateHandlers.length = 0;
    clock = 2_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    setAutoLocation();
    storage.set(storageKeys.salah.lastAutoCoords, '24.71,46.68');
    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandlers.push(handler);
      return { remove: jest.fn() } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the saved place at once, not pending and marked stale, while the real read is still open', async () => {
    let landRead: (value: { lat: number; lng: number }) => void = () => undefined;
    jest.mocked(getCoordinates).mockImplementationOnce(() => new Promise((resolve) => (landRead = resolve)));

    const { result } = await renderHook(() => usePrayerLocation());

    expect(result.current.pending).toBe(false);
    expect(result.current.coords).toEqual({ lat: 24.71, lng: 46.68 });
    expect(result.current.stale).toBe(true);
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    await act(async () => {
      landRead(RIYADH);
    });
    await waitFor(() => expect(result.current.stale).toBe(false));
    expect(result.current.coords).toEqual(RIYADH);
  });

  it('does not seed a first-time user with nothing saved: they still see the locating state', async () => {
    storage.remove(storageKeys.salah.lastAutoCoords);
    let landRead: (value: { lat: number; lng: number }) => void = () => undefined;
    jest.mocked(getCoordinates).mockImplementationOnce(() => new Promise((resolve) => (landRead = resolve)));

    const { result } = await renderHook(() => usePrayerLocation());

    expect(result.current.pending).toBe(true);
    expect(result.current.coords).toBeNull();
    await act(async () => {
      landRead(RIYADH);
    });
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it('re-reads on foreground while the place is stale, so a return to the app retries a fresh fix', async () => {
    jest.mocked(getCoordinates).mockResolvedValueOnce(null);
    const { result } = await renderHook(() => usePrayerLocation());
    await waitFor(() => expect(result.current.stale).toBe(true));
    expect(getCoordinates).toHaveBeenCalledTimes(1);

    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
    await act(async () => {
      for (const handler of appStateHandlers) {
        handler('active');
      }
    });

    await waitFor(() => expect(result.current.stale).toBe(false));
    expect(result.current.coords).toEqual(RIYADH);
    expect(getCoordinates).toHaveBeenCalledTimes(2);
  });
});
