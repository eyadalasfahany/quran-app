import * as Haptics from 'expo-haptics';
import { openContentDb } from '@/core/db/content/open';

import type { KhatmaPlan } from './data/model';
import { planProgress, toLocalDateString } from './data/plan';
import type { UserStore } from './data/repository';
import { listLogsForPlan, updateKhatmaPosition } from './data/repository';
import { resolvePlanBounds } from './plan-bounds';

export type KhatmaMarkBounds = { startPage: number; pagesTotal: number };

export function resolveKhatmaMarkBounds(
  startVerseId: number,
  boundsOverride?: KhatmaMarkBounds,
): KhatmaMarkBounds | null {
  if (boundsOverride !== undefined) {
    return boundsOverride;
  }
  try {
    return resolvePlanBounds(openContentDb().executor, startVerseId);
  } catch {
    return null;
  }
}

/** Marks the ayah as the khatma position and plays the spec haptic when today's target is met. */
export function markKhatmaPosition(input: {
  plan: KhatmaPlan;
  verseId: number;
  page: number;
  store?: UserStore;
  boundsOverride?: KhatmaMarkBounds;
}): { logged: boolean; completed: boolean } {
  const bounds = resolveKhatmaMarkBounds(input.plan.startVerseId, input.boundsOverride);
  if (bounds === null) {
    return { logged: false, completed: false };
  }

  const result = updateKhatmaPosition(
    {
      page: input.page,
      pagesTotal: bounds.pagesTotal,
      startPage: bounds.startPage,
      verseId: input.verseId,
    },
    input.store,
  );

  const store = input.store;
  const today = toLocalDateString(new Date(store?.now?.() ?? Date.now()));
  const logs = listLogsForPlan(input.plan.id, store);
  const progress = planProgress(input.plan, logs, today, bounds.pagesTotal);
  const todayPages = logs.find((log) => log.date === today)?.pagesRead ?? 0;

  if (result.logged && todayPages >= progress.todayTarget) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  } else {
    void Haptics.selectionAsync().catch(() => undefined);
  }

  return result;
}
