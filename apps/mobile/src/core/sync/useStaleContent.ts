import { useMemo, useState } from 'react';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { openContentDb, useContentDb } from '@/core/db/content/open';

import { useCatalogVersion } from './catalog-version';

// Spec §7, hop 3, item 6: content not checked for more than seven days shows a quiet banner.
export const STALE_CONTENT_MS = 7 * 24 * 60 * 60 * 1000;

/** True when the oldest installed resource was last checked more than seven days before `now`. None installed: not stale. */
export function isContentStale(oldestCheckedAt: number | null, now: number): boolean {
  return oldestCheckedAt !== null && now - oldestCheckedAt > STALE_CONTENT_MS;
}

/** The oldest `last_checked_at` across the installed resources, or null when none is installed. */
export function oldestCheckedAt(db: SqlExecutor): number | null {
  const row = db.get<{ oldest: number | null }>('SELECT MIN(last_checked_at) AS oldest FROM installed_resources');
  return row?.oldest ?? null;
}

/**
 * Whether the device's content has gone more than seven days without a check. It is read again after each sync. The
 * clock is taken when the hook mounts, and again from the catalogue store each time a sync changes it, so the clock
 * is never read during render and there is no timer.
 */
export function useStaleContent(): boolean {
  const { ready } = useContentDb();
  const version = useCatalogVersion((state) => state.version);
  const settled = useCatalogVersion((state) => state.syncSettled);
  const changedAt = useCatalogVersion((state) => state.changedAt);
  const [mountedAt] = useState(() => Date.now());
  const clock = changedAt ?? mountedAt;

  return useMemo(() => {
    if (!ready) {
      return false;
    }
    return isContentStale(oldestCheckedAt(openContentDb().executor), clock);
    // version, settled and clock are the signals to read again; the query itself reads the database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, settled, clock]);
}
