import type { SqlExecutor } from '@/core/db/sql-executor';

const NO_NAMES_RESOURCE_ID = -1;

export function activeNamesResourceId(db: SqlExecutor): number {
  const row = db.get<{ resourceId: number }>(
    `SELECT resource_id AS resourceId FROM installed_resources
     WHERE "group" = 'names'
     ORDER BY resource_id ASC
     LIMIT 1`,
  );
  return row?.resourceId ?? NO_NAMES_RESOURCE_ID;
}
