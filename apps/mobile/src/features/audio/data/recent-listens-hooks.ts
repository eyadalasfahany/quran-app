import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { openUserDb } from '@/core/db/user/open';
import { recentListens } from '@/core/db/user/schema';

/** The newest listens, re-read whenever the recent_listens table changes. */
export function useRecentListens(limit = 2) {
  const { db } = openUserDb();
  return useLiveQuery(
    db
      .select({
        audioFileId: recentListens.audioFileId,
        reciterResourceId: recentListens.reciterResourceId,
        chapterId: recentListens.chapterId,
        lastPositionMs: recentListens.lastPositionMs,
        playedAt: recentListens.playedAt,
      })
      .from(recentListens)
      .orderBy(desc(recentListens.playedAt), desc(recentListens.audioFileId))
      .limit(limit),
    [limit],
  );
}
