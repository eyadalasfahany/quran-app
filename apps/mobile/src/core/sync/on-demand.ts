import type { SqlExecutor } from '@/core/db/sql-executor';

// Kept in content.db's meta table, so a rebuilt content.db forgets it together with the packs.
const ON_DEMAND_KEY = 'on_demand_resource_ids';

/** Resources the reader installed one at a time. Sync keeps them selected. */
export function onDemandResourceIds(db: SqlExecutor): number[] {
  const raw = db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [ON_DEMAND_KEY])?.value;
  if (raw === undefined) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is number => Number.isInteger(item));
  } catch {
    return [];
  }
}

export function keepOnDemand(db: SqlExecutor, resourceIds: readonly number[]): void {
  const ids = new Set([...onDemandResourceIds(db), ...resourceIds]);
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    ON_DEMAND_KEY,
    JSON.stringify([...ids].sort((a, b) => a - b)),
  ]);
}

export function installedTafsirIds(db: SqlExecutor): number[] {
  return db
    .all<{ resourceId: number }>(`SELECT resource_id AS resourceId FROM installed_resources WHERE "group" = ?`, ['tafsirs'])
    .map((row) => row.resourceId);
}
