import { useMemo } from 'react';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { toLocalDateString, useActivePlan, usePlanLogs } from '@/features/khatma/data';

import { homeWirdFor, type HomeWird } from '../data/home-wird';

export type { HomeWird } from '../data/home-wird';

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
      return homeWirdFor({
        executor: openContentDb().executor,
        logs: planLogs.data,
        plan: activePlan,
        today,
      });
    } catch {
      return null;
    }
  }, [activePlan, planLogs.data, ready, today]);
}
