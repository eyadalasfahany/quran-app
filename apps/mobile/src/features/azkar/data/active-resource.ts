import type { SqlExecutor } from '@/core/db/sql-executor';

import { FIXTURE_RESOURCE_ID } from './dev-fixtures';

/**
 * The one azkar resource every Azkar read uses. Several azkar sources can be installed at once (for example two
 * upstream books during a source change), and their rows share keys and ids, so reading all of them shows every
 * category twice.
 *
 * `installed_resources` keeps no install time, so the choice is the lowest resource id: it is stable across syncs and
 * matches the primary source (OpenDua, id 2) while both are installed. Dev fixtures (`resource_id = -1`) are used only
 * when no real azkar resource is installed.
 */
export function activeAzkarResourceId(db: SqlExecutor): number {
  const row = db.get<{ resourceId: number }>(
    `SELECT resource_id AS resourceId FROM installed_resources
     WHERE "group" = 'azkar'
     ORDER BY resource_id ASC
     LIMIT 1`,
  );
  return row?.resourceId ?? FIXTURE_RESOURCE_ID;
}
