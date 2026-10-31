import { and, desc, asc, eq, max, sql } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { azkarFavorites, azkarProgress } from '@/core/db/user/schema';

export function liveScopeProgressQuery(db: UserDatabase, scopeKey: string, periodKey: string) {
  return db
    .select({
      scopeKey: azkarProgress.scopeKey,
      periodKey: azkarProgress.periodKey,
      itemKey: azkarProgress.itemKey,
      currentCount: azkarProgress.currentCount,
      completedAt: azkarProgress.completedAt,
      updatedAt: azkarProgress.updatedAt,
    })
    .from(azkarProgress)
    .where(and(eq(azkarProgress.scopeKey, scopeKey), eq(azkarProgress.periodKey, periodKey)))
    .orderBy(asc(azkarProgress.itemKey));
}

/** One row per (scope, period): the input to `pickLastActiveScope`. */
export function liveProgressSummaryQuery(db: UserDatabase) {
  return db
    .select({
      scopeKey: azkarProgress.scopeKey,
      periodKey: azkarProgress.periodKey,
      completedUnits: sql<number>`count(CASE WHEN ${azkarProgress.itemKey} <> '__session__' THEN ${azkarProgress.completedAt} END)`,
      updatedAt: max(azkarProgress.updatedAt),
    })
    .from(azkarProgress)
    .groupBy(azkarProgress.scopeKey, azkarProgress.periodKey);
}

export function liveFavoritesQuery(db: UserDatabase) {
  return db
    .select({ entryKey: azkarFavorites.entryKey, createdAt: azkarFavorites.createdAt })
    .from(azkarFavorites)
    .orderBy(desc(azkarFavorites.createdAt), asc(azkarFavorites.entryKey));
}

export function liveIsFavoriteQuery(db: UserDatabase, entryKey: string) {
  return db
    .select({ entryKey: azkarFavorites.entryKey })
    .from(azkarFavorites)
    .where(eq(azkarFavorites.entryKey, entryKey))
    .limit(1);
}
