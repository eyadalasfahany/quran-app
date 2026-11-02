import type { SqlExecutor } from '@/core/db/sql-executor';

/**
 * The resource id no Azkar row carries. Reads against it find nothing, so they show the empty state when no azkar
 * resource is installed. (The test fixtures use the same value; see `__fixtures__/dev-fixtures.ts`.)
 */
const NO_AZKAR_RESOURCE_ID = -1;

/**
 * The one azkar resource every Azkar read uses. Several azkar sources can be installed at once (for example two
 * upstream books during a source change), and their rows share keys and ids, so reading all of them shows every
 * category twice.
 *
 * `installed_resources` keeps no install time, so the choice is the lowest resource id: it is stable across syncs and
 * matches the primary source (OpenDua, id 2) while both are installed. With no azkar resource installed the id is
 * `NO_AZKAR_RESOURCE_ID`, which matches no rows.
 */
export function activeAzkarResourceId(db: SqlExecutor): number {
  const row = db.get<{ resourceId: number }>(
    `SELECT resource_id AS resourceId FROM installed_resources
     WHERE "group" = 'azkar'
     ORDER BY resource_id ASC
     LIMIT 1`,
  );
  return row?.resourceId ?? NO_AZKAR_RESOURCE_ID;
}
