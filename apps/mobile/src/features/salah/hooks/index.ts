import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { getCoordinates, getStoredLocationSource, getStoredManualCityId, LocationSource } from '../data/location';
import { PrayerTimesOutput, nextPrayer, timesFor } from '../data/prayer-times';
import { formatHijriDate } from '../../../core/i18n/dates';
import { getLocale } from '../../../core/i18n';
import { getCityById } from '../data/cities';

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

  useEffect(() => {
    const fetchLocation = async () => {
      const source = getStoredLocationSource();
      const manualCityId = getStoredManualCityId();
      const permissionStatus = (await Location.getForegroundPermissionsAsync()).status;
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
    };
    fetchLocation();
  }, []);

  return location;
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
