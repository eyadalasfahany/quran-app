import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { parseDailyGoals, saveDailyGoals, type DailyGoals } from '../data/goals';

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    if (key === storageKeys.dailyGoals) {
      onChange();
    }
  });
  return () => listener.remove();
}

function snapshot(): string | undefined {
  return storage.getString(storageKeys.dailyGoals);
}

/**
 * The saved daily goals, live. `update` writes the whole choice at once; every reader (the sheet and Home's progress)
 * sees it on the next render.
 */
export function useDailyGoals(): { goals: DailyGoals; update: (next: DailyGoals) => void } {
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);
  const goals = useMemo(() => parseDailyGoals(raw), [raw]);
  const update = useCallback((next: DailyGoals) => saveDailyGoals(next), []);
  return { goals, update };
}
