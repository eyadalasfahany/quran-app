import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { getStoredLocationSource } from '../data/location';
import { invalidatePrayerLocation, loadPrayerLocation, peekPrayerLocation, type PrayerLocationSnapshot } from '../data/location-cache';
import { PrayerTimesOutput, NextPrayerName, nextPrayer, timesFor } from '../data/prayer-times';
import { bellStorageKey, getBellEnabled } from '../data/bells';
import { setPrayerBell } from '../data/notifications';
import { dateForDayKey, dayKeyOf, nextClockBoundary } from '../data/clock';
import { formatHijriDate } from '../../../core/i18n/dates';
import { getLocale } from '../../../core/i18n';
import { storage } from '../../../core/storage/mmkv';

export { useNow } from './useNow';

// A boundary timer fires a moment after the boundary, so `now` is past it when the state is recomputed.
const CLOCK_SLACK_MS = 50;

export interface PrayerLocation extends PrayerLocationSnapshot {
  /** True while the location is being read for the first time or after a refresh. */
  pending: boolean;
  /** Re-reads the location, bypassing the cache (after a permission prompt or a city choice). */
  refresh: () => Promise<void>;
}

const EMPTY_SNAPSHOT: PrayerLocationSnapshot = {
  source: 'auto',
  coords: null,
  permissionStatus: Location.PermissionStatus.UNDETERMINED,
};

/**
 * The prayer location, shared by Home, Menu, Salah and Qibla. One read (permission and coordinates) serves every consumer
 * for a short time (`LOCATION_CACHE_TTL_MS`), so a mount does not repeat the GPS work. `pending` is true until the first
 * read lands, so a screen can show a loading state instead of the no-location state.
 */
export const usePrayerLocation = (): PrayerLocation => {
  const [snapshot, setSnapshot] = useState<PrayerLocationSnapshot | null>(() => peekPrayerLocation());
  const [pending, setPending] = useState(snapshot === null);

  const load = useCallback(async () => {
    const next = await loadPrayerLocation();
    setSnapshot(next);
    setPending(false);
  }, []);

  useEffect(() => {
    // Reads the stored or GPS location (external systems). The result lands after the awaits, and only if still mounted.
    if (peekPrayerLocation() !== null) {
      return undefined;
    }
    let mounted = true;
    void loadPrayerLocation().then((next) => {
      if (mounted) {
        setSnapshot(next);
        setPending(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // The Qibla and Salah screens re-read after a permission prompt or a city choice, so the cache is dropped first.
  const refresh = useCallback(() => {
    invalidatePrayerLocation();
    setPending(true);
    return load();
  }, [load]);

  const view = snapshot ?? { ...EMPTY_SNAPSHOT, source: getStoredLocationSource() };
  return {
    cityId: view.cityId,
    cityName: view.cityName,
    coords: view.coords,
    pending,
    permissionStatus: view.permissionStatus,
    refresh,
    source: view.source,
  };
};

/**
 * The day's prayer times at `coords`, memoised on the coordinates and the local day only. The ticking `now` of the
 * countdown does not recompute them: they change once a day (adhan reads only the local date).
 */
export const useTodayTimes = (coords: { lat: number; lng: number } | null, now?: Date) => {
  const dayKey = dayKeyOf(now ?? new Date());
  return useMemo(() => (coords ? timesFor(dateForDayKey(dayKey), coords) : null), [coords, dayKey]);
};

/**
 * A clock for the prayer screen that re-renders only when the prayer state can change: at the next prayer time and at
 * local midnight. The countdown ticks on its own (NextPrayerCountdown), so the screen does not tick every second.
 */
export const usePrayerClock = (coords: { lat: number; lng: number } | null): { now: Date; times: PrayerTimesOutput | null } => {
  const [now, setNow] = useState(() => new Date());
  const times = useTodayTimes(coords, now);

  useEffect(() => {
    const boundary = nextClockBoundary(now, times);
    const delay = Math.max(0, boundary.getTime() - Date.now()) + CLOCK_SLACK_MS;
    const timer = setTimeout(() => setNow(new Date()), delay);
    return () => clearTimeout(timer);
  }, [now, times]);

  return { now, times };
};

export const useNextPrayer = (times: PrayerTimesOutput | null, coords: { lat: number; lng: number } | null, now?: Date) => {
  return useMemo(() => (times && coords ? nextPrayer(times, now ?? new Date(), coords) : null), [times, coords, now]);
};

export const useHijriDate = (now?: Date) => {
  const locale = getLocale();
  return useMemo(() => formatHijriDate(now ?? new Date(), locale), [now, locale]);
};

/**
 * A prayer's reminder bell, persisted in MMKV and live: the Salah row and the Settings section share it. Turning it on
 * asks for notification permission first; a refusal leaves it off and sets `permissionDenied`, and the caller shows
 * PrayerPermissionDialog until `dismissPermissionDenied` (ADR 0030 §3). Each applied change re-plans the prayer
 * notifications.
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

  // Set when the system refused permission; cleared by the dialog's dismissal or by the next applied change.
  const [permissionDenied, setPermissionDenied] = useState(false);

  const setEnabled = useCallback(
    async (on: boolean): Promise<boolean> => {
      const applied = await setPrayerBell(name, on);
      setPermissionDenied(!applied);
      return applied;
    },
    [name],
  );

  const dismissPermissionDenied = useCallback(() => setPermissionDenied(false), []);

  const toggle = useCallback(() => {
    void setEnabled(!getBellEnabled(name));
  }, [name, setEnabled]);

  return { enabled, setEnabled, toggle, permissionDenied, dismissPermissionDenied };
};
