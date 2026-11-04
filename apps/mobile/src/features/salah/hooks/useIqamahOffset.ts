import { useCallback, useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { getIqamahOffsetMinutes, type IqamahOffsetMinutes } from '../data/iqamah-offset';

/**
 * The global iqamah offset (ADR 0056), kept in step with MMKV so Settings updates without a focus event.
 */
export function useIqamahOffset(): IqamahOffsetMinutes {
  const subscribe = useCallback((onChange: () => void) => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === storageKeys.salah.iqamahOffsetMinutes) {
        onChange();
      }
    });
    return () => listener.remove();
  }, []);

  return useSyncExternalStore(subscribe, getIqamahOffsetMinutes);
}
