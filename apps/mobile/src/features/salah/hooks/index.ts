import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { getCoordinates, getStoredLocationSource, getStoredManualCityId, LocationSource } from '../data/location';
import { PrayerTimesOutput, NextPrayerName, nextPrayer, timesFor } from '../data/prayer-times';
import { getBellEnabled, setBellEnabled } from '../data/bells';
import { formatHijriDate } from '../../../core/i18n/dates';
import { getLocale } from '../../../core/i18n';
import { getCityById } from '../data/cities';

export { useNow } from './useNow';

interface PrayerLocation {
  source: LocationSource;
  coords: { lat: number; lng: number } | null;
  cityId?: string;
  cityName?: { ar: string; en: string };
  permissionStatus: Location.PermissionStatus;
}

export const usePrayerLocation = () => {
  const [location, setLocation] = useState<PrayerLocation>({
    source: getStoredLocationSource(),
    coords: null,
    permissionStatus: Location.PermissionStatus.UNDETERMINED,
  });

  const fetchLocation = useCallback(async () => {
    const source = getStoredLocationSource();
    const manualCityId = getStoredManualCityId();
    let permissionStatus: Location.PermissionStatus = Location.PermissionStatus.UNDETERMINED;
    try {
      const result = await Location.getForegroundPermissionsAsync();
      permissionStatus = result?.status ?? Location.PermissionStatus.UNDETERMINED;
    } catch {
      // Native location is missing (Jest, or a device without the module).
    }
    const coords = await getCoordinates();

    let cityName: { ar: string; en: string } | undefined;
    if (source === 'manual' && manualCityId) {
      const city = getCityById(manualCityId);
      if (city) {
        cityName = { ar: city.ar, en: city.en };
      }
    }

    setLocation({
      source,
      coords,
      cityId: manualCityId,
      cityName,
      permissionStatus,
    });
  }, []);

  useEffect(() => {
    // Reads the stored or GPS location (external systems); setState lands after the awaits.
    const load = async () => {
      await fetchLocation();
    };
    void load();
  }, [fetchLocation]);

  // The Qibla screen re-reads after its location button asks for permission.
  return { ...location, refresh: fetchLocation };
};

// Pure derivations, not effects: pass the screen's ticking `now` (step 3 countdown)
// so "today" and the next prayer roll over correctly as time advances.
export const useTodayTimes = (coords: { lat: number; lng: number } | null, now?: Date) => {
  return useMemo(() => (coords ? timesFor(now ?? new Date(), coords) : null), [coords, now]);
};

export const useNextPrayer = (times: PrayerTimesOutput | null, coords: { lat: number; lng: number } | null, now?: Date) => {
  return useMemo(() => (times && coords ? nextPrayer(times, now ?? new Date(), coords) : null), [times, coords, now]);
};

export const useHijriDate = (now?: Date) => {
  const locale = getLocale();
  return useMemo(() => formatHijriDate(now ?? new Date(), locale), [now, locale]);
};

// A prayer's reminder toggle: persisted to MMKV on tap (step 3); the scheduler reads it in step 4.
export const useBell = (name: NextPrayerName) => {
  const [enabled, setEnabled] = useState(() => getBellEnabled(name));

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      setBellEnabled(name, next);
      return next;
    });
  }, [name]);

  return { enabled, toggle };
};
