import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import * as locationCache from '@/features/salah/data/location-cache';

import { useMoonLocation } from './useMoonLocation';

describe('useMoonLocation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads peekPrayerLocation and loadPrayerLocation only', async () => {
    jest.spyOn(locationCache, 'peekPrayerLocation').mockReturnValue(null);
    const load = jest.spyOn(locationCache, 'loadPrayerLocation').mockResolvedValue({
      source: 'manual',
      stale: false,
      coords: { lat: 21.4, lng: 39.8 },
      cityId: 'makkah',
      cityName: { ar: 'FIXTURE city 1 — not a dhikr', en: 'FIXTURE city 1 — not a dhikr' },
      permissionStatus: Location.PermissionStatus.GRANTED,
    });
    jest.spyOn(locationCache, 'invalidatePrayerLocation');

    const view = await renderHook(() => useMoonLocation());

    await waitFor(() => expect(view.result.current.pending).toBe(false));

    expect(load).toHaveBeenCalled();
    expect(view.result.current.snapshot?.coords).toEqual({ lat: 21.4, lng: 39.8 });
  });
});
