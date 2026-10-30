import { and, asc, eq, isNull, max, sql } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { khatmaLogs, khatmaPlans } from '@/core/db/user/schema';

const planColumns = {
  id: khatmaPlans.id,
  durationDays: khatmaPlans.durationDays,
  startVerseId: khatmaPlans.startVerseId,
  startDate: khatmaPlans.startDate,
  status: khatmaPlans.status,
  completedAt: khatmaPlans.completedAt,
  clientUpdatedAt: khatmaPlans.clientUpdatedAt,
};

const logColumns = {
  id: khatmaLogs.id,
  planId: khatmaLogs.planId,
  date: khatmaLogs.date,
  pagesRead: khatmaLogs.pagesRead,
  lastVerseId: khatmaLogs.lastVerseId,
  clientUpdatedAt: khatmaLogs.clientUpdatedAt,
};

export function liveActivePlanQuery(db: UserDatabase) {
  return db
    .select(planColumns)
    .from(khatmaPlans)
    .where(and(eq(khatmaPlans.status, 'active'), isNull(khatmaPlans.deletedAt)))
    .limit(1);
}

export function livePlanLogsQuery(db: UserDatabase, planId: string | null | undefined) {
  const selected = db.select(logColumns).from(khatmaLogs);

  if (planId === null || planId === undefined || planId === '') {
    return selected.where(sql`1 = 0`).orderBy(asc(khatmaLogs.date), asc(khatmaLogs.id));
  }

  return selected
    .where(and(eq(khatmaLogs.planId, planId), isNull(khatmaLogs.deletedAt)))
    .orderBy(asc(khatmaLogs.date), asc(khatmaLogs.id));
}

export function liveKhatmaMarkerQuery(db: UserDatabase, planId: string | null | undefined) {
  if (planId === null || planId === undefined || planId === '') {
    return db
      .select({ markerVerseId: sql<number | null>`null`.as('markerVerseId') })
      .from(khatmaLogs)
      .where(sql`1 = 0`);
  }

  return db
    .select({ markerVerseId: max(khatmaLogs.lastVerseId) })
    .from(khatmaLogs)
    .where(and(eq(khatmaLogs.planId, planId), isNull(khatmaLogs.deletedAt)));
}
