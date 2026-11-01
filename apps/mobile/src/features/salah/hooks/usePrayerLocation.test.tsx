import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { storage } from '@/core/storage/mmkv';

import { getCoordinates, getLocationPermissionStatus, setAutoLocation } from '../data/location';
import { invalidatePrayerLocation } from '../data/location-cache';
import { usePrayerLocation } from './index';

jest.mock('../data/location', () => ({
  ...jest.requireActual<typeof import('../data/location')>('../data/location'),
  getCoordinates: jest.fn(),
  getLocationPermissionStatus: jest.fn(),
}));

const RIYADH = { lat: 24.7136, lng: 46.6753 };

describe('usePrayerLocation', () => {
  beforeEach(() => {
    storage.clearAll();
    invalidatePrayerLocation();
    jest.clearAllMocks();
    setAutoLocation();
    jest.mocked(getLocationPermissionStatus).mockResolvedValue(Location.PermissionStatus.GRANTED);
    jest.mocked(getCoordinates).mockResolvedValue(RIYADH);
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
