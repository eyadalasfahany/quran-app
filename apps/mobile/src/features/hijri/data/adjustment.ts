import { useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { clampAdjustDays } from './hijri-date';

/** The user's Hijri adjustment in days, −2 to +2 (ADR 0048 decision 2). Stored in MMKV; cleared with personal data. */
export function getHijriAdjustDays(): number {
  const saved = storage.getNumber(storageKeys.hijriAdjustDays);
  return saved === undefined ? 0 : clampAdjustDays(saved);
}

export function setHijriAdjustDays(value: number): void {
  const clamped = clampAdjustDays(value);
  if (clamped === 0) {
    storage.remove(storageKeys.hijriAdjustDays);
    return;
  }
  storage.set(storageKeys.hijriAdjustDays, clamped);
}

/** Live adjustment: the Home pill, the calendar, the Menu card and the Salah header update together. */
export function useHijriAdjustment(): readonly [number, (value: number) => void] {
  const subscribe = (onChange: () => void) => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === storageKeys.hijriAdjustDays) {
        onChange();
      }
    });
    return () => listener.remove();
  };
  const value = useSyncExternalStore(subscribe, getHijriAdjustDays);
  return [value, setHijriAdjustDays] as const;
}
