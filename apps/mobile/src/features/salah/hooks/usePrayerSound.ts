import { useCallback, useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getPrayerSound, type PrayerSoundId } from '../data/adhan-sounds';

/**
 * The chosen prayer sound (ADR 0047), kept in step with MMKV: a change made on the picker shows up in Settings as soon as
 * it is written, with no focus event needed. The same pattern as `useBell`.
 */
export function usePrayerSound(): PrayerSoundId {
  const subscribe = useCallback((onChange: () => void) => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === storageKeys.salah.prayerSound) {
        onChange();
      }
    });
    return () => listener.remove();
  }, []);

  return useSyncExternalStore(subscribe, getPrayerSound);
}
