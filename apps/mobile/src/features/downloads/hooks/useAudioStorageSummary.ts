import { count, eq, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openUserDb } from '@/core/db/user/open';
import { downloads } from '@/core/db/user/schema';

export type ReciterAudioSummary = {
  reciterResourceId: number;
  surahCount: number;
  bytes: number;
};

export type AudioStorageSummaryResult = {
  perReciter: ReciterAudioSummary[];
  totalBytes: number;
};

export function useAudioStorageSummary(): AudioStorageSummaryResult {
  const { db } = openUserDb();
  const { data } = useLiveQuery(
    db
      .select({
        reciterResourceId: downloads.reciterResourceId,
        surahCount: count(),
        bytes: sql<number>`COALESCE(SUM(${downloads.sizeBytes}), 0)`,
      })
      .from(downloads)
      .where(eq(downloads.status, 'done'))
      .groupBy(downloads.reciterResourceId),
  );

  return useMemo((): AudioStorageSummaryResult => {
    const perReciter = (data ?? []).map((row) => ({
      reciterResourceId: row.reciterResourceId,
      surahCount: row.surahCount,
      bytes: row.bytes,
    }));
    const totalBytes = perReciter.reduce((acc, r) => acc + r.bytes, 0);
    return { perReciter, totalBytes };
  }, [data]);
}
