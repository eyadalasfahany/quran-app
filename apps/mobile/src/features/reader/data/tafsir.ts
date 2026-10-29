import type { SqlExecutor } from '@/core/db/sql-executor';

export type TafsirEntry = {
  resourceId: number;
  groupTafsirId: number;
  firstVerseId: number;
  lastVerseId: number;
  html: string;
};

/** Display fields from the manifest. Null until the resource has been seen by a sync. */
export type ResourceNames = {
  name: string | null;
  nameAr: string | null;
  authorName: string | null;
  authorAr: string | null;
  languageCode: string | null;
  direction: 'rtl' | 'ltr' | null;
};

export type InstalledContentResource = ResourceNames & {
  resourceId: number;
  group: string;
  version: number;
  sha256: string;
  lastCheckedAt: number;
  changeCursor: string | null;
};

export type CatalogTafsir = ResourceNames & {
  resourceId: number;
  version: number;
  packSizeBytes: number;
  installed: boolean;
};

type InstalledRow = Omit<InstalledContentResource, 'group' | 'direction'> & {
  resourceGroup: string;
  direction: string | null;
};

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
         change_cursor AS changeCursor,
         name,
         name_ar AS nameAr,
         author_name AS authorName,
         author_ar AS authorAr,
         language_code AS languageCode,
         direction
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
      name: row.name,
      nameAr: row.nameAr,
      authorName: row.authorName,
      authorAr: row.authorAr,
      languageCode: row.languageCode,
      direction: toDirection(row.direction),
    }));
}

/** Every Arabic tafsir in the device catalogue, installed or not, for the chip list and downloads. */
export function listCatalogTafsirs(db: SqlExecutor): CatalogTafsir[] {
  return db
    .all<Omit<CatalogTafsir, 'direction' | 'installed'> & { direction: string | null; installed: number }>(
      `SELECT
         resource_id AS resourceId,
         name,
         name_ar AS nameAr,
         author_name AS authorName,
         author_ar AS authorAr,
         language_code AS languageCode,
         direction,
         version,
         pack_size_bytes AS packSizeBytes,
         EXISTS (SELECT 1 FROM installed_resources WHERE installed_resources.resource_id = catalog_resources.resource_id) AS installed
       FROM catalog_resources
       WHERE "group" = ?
       ORDER BY resource_id`,
      ['tafsirs'],
    )
    .map((row) => ({
      resourceId: row.resourceId,
      name: row.name,
      nameAr: row.nameAr,
      authorName: row.authorName,
      authorAr: row.authorAr,
      languageCode: row.languageCode,
      direction: toDirection(row.direction),
      version: row.version,
      packSizeBytes: row.packSizeBytes,
      installed: row.installed === 1,
    }));
}

function toDirection(value: string | null): 'rtl' | 'ltr' | null {
  return value === 'rtl' || value === 'ltr' ? value : null;
}
