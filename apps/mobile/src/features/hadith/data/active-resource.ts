import type { SqlExecutor } from '@/core/db/sql-executor';

/**
 * The installed resource id of a hadith collection, or `undefined` for an unknown or uninstalled slug. Every repository
 * function returns an empty list, `undefined` or `false` in that case.
 */
export function hadithResourceId(db: SqlExecutor, slug: string): number | undefined {
  const row = db.get<{ resourceId: number }>(
    `SELECT c.resource_id AS resourceId
     FROM hadith_collections c
     JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections'
     WHERE c.slug = ?
     LIMIT 1`,
    [slug],
  );
  return row?.resourceId;
}
