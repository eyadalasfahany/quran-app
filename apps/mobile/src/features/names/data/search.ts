import type { SqlExecutor } from '@/core/db/sql-executor';

import { activeNamesResourceId } from './active-resource';

/** Normalises a query like `text_search` (optional leading ال, hamza variants). */
export function normalizeNamesQuery(raw: string): string {
  let query = raw.trim().toLowerCase();
  if (query.startsWith('ال')) {
    query = query.slice(2);
  }
  return query.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
}

export function searchNames(db: SqlExecutor, rawQuery: string, limit = 99): string[] {
  const query = normalizeNamesQuery(rawQuery);
  if (query === '') {
    return [];
  }
  const resourceId = activeNamesResourceId(db);
  const rows = db.all<{ nameSlug: string }>(
    `SELECT name_slug AS nameSlug FROM names
     WHERE resource_id = ? AND text_search LIKE ?
     ORDER BY position ASC
     LIMIT ?`,
    [resourceId, `%${query}%`, limit],
  );
  return rows.map((row) => row.nameSlug);
}
