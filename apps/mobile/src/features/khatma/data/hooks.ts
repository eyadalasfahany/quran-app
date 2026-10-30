import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { openUserDb } from '@/core/db/user/open';

import { liveActivePlanQuery, liveKhatmaMarkerQuery, livePlanLogsQuery } from './live-queries';

export function useActivePlan() {
  const { db } = openUserDb();
  return useLiveQuery(liveActivePlanQuery(db));
}

export function usePlanLogs(planId: string | null | undefined) {
  const { db } = openUserDb();
  return useLiveQuery(livePlanLogsQuery(db, planId), [planId ?? '']);
}

export function useKhatmaMarkerVerseId(planId: string | null | undefined): number | null {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveKhatmaMarkerQuery(db, planId), [planId ?? '']);
  const markerVerseId = data[0]?.markerVerseId;
  return markerVerseId ?? null;
}
