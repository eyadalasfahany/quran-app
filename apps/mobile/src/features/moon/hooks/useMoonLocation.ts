import { useCallback, useEffect, useState } from 'react';

import {
  loadPrayerLocation,
  peekPrayerLocation,
  type PrayerLocationSnapshot,
} from '@/features/salah/data/location-cache';

/**
 * Read-only view of Salah's cached location (ADR 0043 C3). Never writes MMKV or requests permission.
 */
export function useMoonLocation(): {
  snapshot: PrayerLocationSnapshot | null;
  pending: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState<PrayerLocationSnapshot | null>(() => peekPrayerLocation());
  const [pending, setPending] = useState(snapshot === null);

  const refresh = useCallback(async () => {
    const next = await loadPrayerLocation();
    setSnapshot(next);
    setPending(false);
  }, []);

  useEffect(() => {
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

  return { snapshot, pending, loading: pending, refresh };
}
