import type { SqlExecutor } from '@/core/db/sql-executor';

/** True when a `names` content pack has at least one row. Missing table reads as false. */
export function hasNamesContent(db: SqlExecutor): boolean {
  try {
    return db.get<{ one: number }>('SELECT 1 AS one FROM names LIMIT 1') !== undefined;
  } catch {
    return false;
  }
}
