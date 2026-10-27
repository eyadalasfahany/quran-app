import type { SqlExecutor } from '@/core/db/sql-executor';

import type { InstalledContentResource } from './translations';

export type TafsirEntry = {
  resourceId: number;
  groupTafsirId: number;
  firstVerseId: number;
  lastVerseId: number;
  html: string;
};

type InstalledRow = Omit<InstalledContentResource, 'group'> & { resourceGroup: string };

// Overlapping ranges resolve to the row that starts latest, then the greater group id.
const TAFSIR_FOR_VERSE = `
  SELECT
    resource_id AS resourceId,
    group_tafsir_id AS groupTafsirId,
    first_verse_id AS firstVerseId,
    last_verse_id AS lastVerseId,
    html
  FROM tafsir_entries
  WHERE resource_id = ?
    AND first_verse_id <= ?
    AND last_verse_id >= ?
  ORDER BY first_verse_id DESC, group_tafsir_id DESC
  LIMIT 1
`;

export function getTafsirForVerse(db: SqlExecutor, resourceId: number, verseId: number): TafsirEntry | undefined {
  return db.get<TafsirEntry>(TAFSIR_FOR_VERSE, [resourceId, verseId, verseId]);
}

export function listInstalledTafsirs(db: SqlExecutor): InstalledContentResource[] {
  return db
    .all<InstalledRow>(
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
      ['tafsirs'],
    )
    .map((row) => ({
      resourceId: row.resourceId,
      group: row.resourceGroup,
      version: row.version,
      sha256: row.sha256,
      lastCheckedAt: row.lastCheckedAt,
      changeCursor: row.changeCursor,
    }));
}
