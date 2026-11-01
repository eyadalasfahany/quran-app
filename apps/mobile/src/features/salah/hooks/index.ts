import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { getCoordinates, getStoredLocationSource, getStoredManualCityId, LocationSource } from '../data/location';
import { PrayerTimesOutput, NextPrayerName, nextPrayer, timesFor } from '../data/prayer-times';
import { bellStorageKey, getBellEnabled } from '../data/bells';
import { setPrayerBell } from '../data/notifications';
import { formatHijriDate } from '../../../core/i18n/dates';
import { getLocale, i18n } from '../../../core/i18n';
import { storage } from '../../../core/storage/mmkv';
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

/** The refusal alert: the same copy and settings link as the daily reminder (Phase 4). */
function presentPermissionDenied(): void {
  Alert.alert(
    i18n.t('settings.reminders.permissionDeniedTitle'),
    i18n.t('settings.reminders.permissionDeniedBody'),
    [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      { text: i18n.t('common.openSettings'), onPress: () => void Linking.openSettings() },
    ],
  );
}

/**
 * A prayer's reminder bell, persisted in MMKV and live: the Salah row and the Settings section share it. Turning it on
 * asks for notification permission first; a refusal leaves it off and shows the guidance alert (ADR 0030 §3). Each
 * applied change re-plans the prayer notifications.
 */
export const useBell = (name: NextPrayerName) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const listener = storage.addOnValueChangedListener((key) => {
        if (key === bellStorageKey(name)) {
          onChange();
        }
      });
      return () => listener.remove();
    },
    [name],
  );
  const enabled = useSyncExternalStore(subscribe, () => getBellEnabled(name));

  const setEnabled = useCallback(
    async (on: boolean): Promise<boolean> => {
      const applied = await setPrayerBell(name, on);
      if (!applied) {
        presentPermissionDenied();
      }
      return applied;
    },
    [name],
  );

  const toggle = useCallback(() => {
    void setEnabled(!getBellEnabled(name));
  }, [name, setEnabled]);

  return { enabled, setEnabled, toggle };
};
