import { useEffect } from 'react';
import { AppState } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { resyncPrayerNotifications, resyncPrayerNotificationsIfNeeded } from '../data/notifications';

/** The Salah location keys: a change to any of them re-plans the prayer notifications at once (ADR 0030 §3). */
const LOCATION_KEYS: readonly string[] = [
  storageKeys.salah.locationSource,
  storageKeys.salah.manualCityId,
  storageKeys.salah.manualLat,
  storageKeys.salah.manualLng,
];

/**
 * Keeps the prayer notifications in step with the day, the time zone, the coordinates and the bells. Mounted once at
 * the root, so it runs whatever tab is open:
 * - on launch (once `enabled`), a full re-plan;
 * - on each return to the foreground, a re-plan only when the day, the time zone or the coordinates moved;
 * - on a location change, the same check, at once. A manual city writes four keys in a row; the queue in
 *   `notifications.ts` lets the first sync do the work and the rest find nothing to change.
 */
export function usePrayerNotificationsSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    void resyncPrayerNotifications();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void resyncPrayerNotificationsIfNeeded();
      }
    });
    const values = storage.addOnValueChangedListener((key) => {
      if (LOCATION_KEYS.includes(key)) {
        void resyncPrayerNotificationsIfNeeded();
      }
    });
    return () => {
      appState.remove();
      values.remove();
    };
  }, [enabled]);
}
