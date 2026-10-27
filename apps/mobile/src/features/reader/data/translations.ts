import type { SqlExecutor } from '@/core/db/sql-executor';

export type TranslationEntry = {
  resourceId: number;
  verseId: number;
  text: string;
  footnotes: string | null;
};

export type InstalledContentResource = {
  resourceId: number;
  group: string;
  version: number;
  sha256: string;
  lastCheckedAt: number;
  changeCursor: string | null;
};

type InstalledRow = Omit<InstalledContentResource, 'group'> & { resourceGroup: string };

export function getTranslations(
  db: SqlExecutor,
  verseIds: readonly number[],
  resourceIds: readonly number[],
): TranslationEntry[] {
  if (verseIds.length === 0 || resourceIds.length === 0) {
    return [];
  }

  return db.all<TranslationEntry>(
    `SELECT
       resource_id AS resourceId,
       verse_id AS verseId,
       text,
       footnotes
     FROM translation_entries
     WHERE verse_id IN (${placeholders(verseIds.length)})
       AND resource_id IN (${placeholders(resourceIds.length)})
     ORDER BY verse_id, resource_id`,
    [...verseIds, ...resourceIds],
  );
}

export function listInstalledTranslations(db: SqlExecutor): InstalledContentResource[] {
  return listInstalled(db, 'translations');
}

function listInstalled(db: SqlExecutor, group: string): InstalledContentResource[] {
  const rows = db.all<InstalledRow>(
    `SELECT
       resource_id AS resourceId,
       "group" AS resourceGroup,
       version,
       sha256,
       last_checked_at AS lastCheckedAt,
       change_cursor AS changeCursor
     FROM installed_resources
     WHERE "group" = ?
     ORDER BY resource_id`,
    [group],
  );

  return rows.map((row) => ({
    resourceId: row.resourceId,
    group: row.resourceGroup,
    version: row.version,
    sha256: row.sha256,
    lastCheckedAt: row.lastCheckedAt,
    changeCursor: row.changeCursor,
  }));
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
