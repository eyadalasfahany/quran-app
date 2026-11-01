import { useMemo } from 'react';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { planProgress, toLocalDateString, useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';

/** The active Khatma plan's position today, for Home's wird card and the daily progress card. */
export type HomeWird = {
  dayIndex: number;
  durationDays: number;
  pagesRead: number;
  pagesTotal: number;
  /** Pages logged today. */
  pagesToday: number;
  /** Today's target: what the plan asks for from today on. */
  todayTarget: number;
};

/** Null without an active plan, or while the content database is not open (Home renders before it). */
export function useHomeWird(): HomeWird | null {
  const { ready } = useContentDb();
  const activePlan = useActivePlan().data[0] ?? null;
  const planLogs = usePlanLogs(activePlan?.id);
  const today = toLocalDateString(new Date());

  return useMemo(() => {
    if (activePlan === null || !ready) {
      return null;
    }
    try {
      const executor = openContentDb().executor;
      const bounds = resolvePlanBounds(executor, activePlan.startVerseId);
      if (bounds === null) {
        return null;
      }
      const progress = planProgress(activePlan, planLogs.data, today, bounds.pagesTotal);
      const pagesToday = planLogs.data
        .filter((log) => log.date === today)
        .reduce((sum, log) => sum + log.pagesRead, 0);
      return {
        dayIndex: progress.dayIndex,
        durationDays: activePlan.durationDays,
        pagesRead: progress.pagesRead,
        pagesToday,
        pagesTotal: progress.pagesTotal,
        todayTarget: progress.todayTarget,
      };
    } catch {
      return null;
    }
  }, [activePlan, planLogs.data, ready, today]);
}
