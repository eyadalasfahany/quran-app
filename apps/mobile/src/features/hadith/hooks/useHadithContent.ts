import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { useCatalogVersion } from '@/core/sync/catalog-version';

/**
 * Reads hadith content from content.db. Re-reads when the catalogue version changes (a pack import or a sync bumps it)
 * and when `deps` change. A thrown error (the database is not open yet, a table is missing) returns `fallback`.
 * Callers pass a module-level constant as `fallback`, so the returned reference is stable across renders.
 */
export function useHadithContent<T>(fallback: T, read: (db: SqlExecutor) => T, deps: readonly unknown[]): T {
  const revision = useCatalogVersion((state) => state.version);

  // The arguments enter the memo as one serialised key, so the dependency list stays a literal.
  const argsKey = JSON.stringify(deps);

  return useMemo(() => {
    try {
      const { executor } = openContentDb();
      return read(executor);
    } catch {
      return fallback;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, argsKey]);
}
