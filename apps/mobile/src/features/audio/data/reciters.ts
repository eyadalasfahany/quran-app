import type { SqlExecutor } from '@/core/db/sql-executor';

const RECITATION_GROUP = 'chapter_recitations';

export type CatalogReciter = {
  resourceId: number;
  name: string | null;
  nameAr: string | null;
  installed: boolean;
  packSizeBytes: number;
  hasTimings: boolean;
  hasWordSegments: boolean;
};

type RecitationStatus = { hasTimings: boolean; hasWordSegments: boolean };

/**
 * Every recitation the device knows: the catalogue, plus installed recitations the catalogue doesn't list
 * (installs from before it existed, which have no pack size). Sorted by resource id.
 * Timings and word segments exist only after the pack is installed, so they are false otherwise.
 */
export function listReciters(db: SqlExecutor): CatalogReciter[] {
  const installed = db.all<{ resourceId: number; name: string | null; nameAr: string | null }>(
    `SELECT resource_id AS resourceId, name, name_ar AS nameAr
     FROM installed_resources
     WHERE "group" = ?`,
    [RECITATION_GROUP],
  );
  const installedIds = new Set(installed.map((row) => row.resourceId));
  const status = recitationStatus(db);

  const catalogue = db
    .all<{ resourceId: number; name: string | null; nameAr: string | null; packSizeBytes: number }>(
      `SELECT resource_id AS resourceId, name, name_ar AS nameAr, pack_size_bytes AS packSizeBytes
       FROM catalog_resources
       WHERE "group" = ?
       ORDER BY resource_id`,
      [RECITATION_GROUP],
    )
    .map((row) => {
      const isInstalled = installedIds.has(row.resourceId);
      const state = isInstalled ? status.get(row.resourceId) : undefined;
      return {
        resourceId: row.resourceId,
        name: row.name,
        nameAr: row.nameAr,
        installed: isInstalled,
        packSizeBytes: row.packSizeBytes,
        hasTimings: state?.hasTimings ?? false,
        hasWordSegments: state?.hasWordSegments ?? false,
      };
    });

  const catalogueIds = new Set(catalogue.map((reciter) => reciter.resourceId));
  const unlisted = installed
    .filter((row) => !catalogueIds.has(row.resourceId))
    .map((row) => {
      const state = status.get(row.resourceId);
      return {
        resourceId: row.resourceId,
        name: row.name,
        nameAr: row.nameAr,
        installed: true,
        packSizeBytes: 0,
        hasTimings: state?.hasTimings ?? false,
        hasWordSegments: state?.hasWordSegments ?? false,
      };
    });

  return [...catalogue, ...unlisted].sort((a, b) => a.resourceId - b.resourceId);
}

/** The `recitations.id` that `chapter_audio_files.recitation_id` points at, for an installed resource. */
export function recitationIdForResource(db: SqlExecutor, resourceId: number): number | undefined {
  return db.get<{ id: number }>('SELECT id FROM recitations WHERE resource_id = ?', [resourceId])?.id;
}

function recitationStatus(db: SqlExecutor): Map<number, RecitationStatus> {
  const rows = db.all<{ resourceId: number; hasWordSegments: number; hasTimings: number }>(
    `SELECT
       resource_id AS resourceId,
       has_word_segments AS hasWordSegments,
       EXISTS (
         SELECT 1
         FROM chapter_audio_files
         JOIN recitation_timings ON recitation_timings.audio_file_id = chapter_audio_files.id
         WHERE chapter_audio_files.recitation_id = recitations.id
       ) AS hasTimings
     FROM recitations`,
  );
  return new Map(
    rows.map((row) => [row.resourceId, { hasTimings: row.hasTimings === 1, hasWordSegments: row.hasWordSegments === 1 }]),
  );
}
