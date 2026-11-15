import { useMemo } from "react";

import { openContentDb } from "@/core/db/content/open";
import type { SqlExecutor } from "@/core/db/sql-executor";
import { useCatalogVersion } from "@/core/sync/catalog-version";

/**
 * Reads Seerah content from content.db. Re-reads when the catalogue version changes (a pack import bumps it) and when
 * `deps` change. A thrown error (the database is not open, a table is missing) returns `fallback`: pass a module-level
 * constant so the reference is stable across renders.
 */
export function useSeerahContent<T>(
  fallback: T,
  read: (db: SqlExecutor) => T,
  deps: readonly unknown[],
): T {
  const revision = useCatalogVersion((state) => state.version);
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
