import type { SqlExecutor } from '@/core/db/sql-executor';

const NO_DUAS_RESOURCE_ID = -1;

/** The installed `duas` pack resource id, or `NO_DUAS_RESOURCE_ID` when none is installed. */
export function activeDuasResourceId(db: SqlExecutor): number {
  const row = db.get<{ resourceId: number }>(
    `SELECT resource_id AS resourceId FROM installed_resources
     WHERE "group" = 'duas'
     ORDER BY resource_id ASC
     LIMIT 1`,
  );

  return row?.resourceId ?? NO_DUAS_RESOURCE_ID;
}
