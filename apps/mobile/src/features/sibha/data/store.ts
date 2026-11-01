import { useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { toLocalDateString } from '@/features/khatma/data/plan';

import { countTap, parseSibhaState, todayTotalFor, type SibhaState, type SibhaToday } from './model';

/** The saved counter (count, target and label). */
export function readSibhaState(): SibhaState {
  return parseSibhaState(storage.getString(storageKeys.sibha.state));
}

export function saveSibhaState(state: SibhaState): void {
  storage.set(storageKeys.sibha.state, JSON.stringify(state));
}

/** Taps counted today, by the local date. */
export function readSibhaTodayTotal(now: Date): number {
  return todayTotalFor(storage.getString(storageKeys.sibha.today), toLocalDateString(now));
}

/** Adds one tap to today's total and returns the new total. */
export function addSibhaTodayTap(now: Date): number {
  const date = toLocalDateString(now);
  const total = todayTotalFor(storage.getString(storageKeys.sibha.today), date) + 1;
  const saved: SibhaToday = { date, total };
  storage.set(storageKeys.sibha.today, JSON.stringify(saved));
  return total;
}

/** Counts one tap on the saved counter and on today's total. */
export function recordSibhaTap(now: Date): { state: SibhaState; reachedTarget: boolean; todayTotal: number } {
  const result = countTap(readSibhaState());
  saveSibhaState(result.state);
  return { reachedTarget: result.reachedTarget, state: result.state, todayTotal: addSibhaTodayTap(now) };
}

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    if (key === storageKeys.sibha.today) {
      onChange();
    }
  });
  return () => listener.remove();
}

function snapshot(): string | undefined {
  return storage.getString(storageKeys.sibha.today);
}

/**
 * Today's misbaha total, live: it re-reads on every saved tap. The date is read on each render, so a new day shows zero
 * on the next render. Home's daily progress uses it.
 */
export function useSibhaTodayTotal(): number {
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);
  return todayTotalFor(raw, toLocalDateString(new Date()));
}
