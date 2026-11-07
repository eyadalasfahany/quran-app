import type { ContentChange, ContentManifestResource } from '@quran/api-contract';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

import { packUrl, type ChangesQuery, type ChangesResult, type ManifestResult } from '../api/content';
import { bumpCatalogVersion } from './catalog-version';
import { columnList, contentGroup, type ContentColumn, type ContentGroupSchema, type ContentTable } from './content-tables';
import { onDemandResourceIds } from './on-demand';

export type PackDownloadOptions = {
  /** Fraction 0..1 of the download, when the platform reports bytes. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export type ContentApi = {
  getManifest: (etag?: string, signal?: AbortSignal) => Promise<ManifestResult>;
  getChanges: (query: ChangesQuery) => Promise<ChangesResult>;
  downloadPack: (url: string, toPath: string, options?: PackDownloadOptions) => Promise<void>;
};

/** A pack download failed before any bytes were trusted. Used to tell network errors from import errors. */
export class PackDownloadError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, PackDownloadError.prototype);
  }
}

export type FileStore = {
  cacheDir: string;
  readBytes: (path: string) => Promise<Uint8Array>;
  writeBytes: (path: string, bytes: Uint8Array) => Promise<void>;
  remove: (path: string) => Promise<void>;
};

export type ContentSyncDeps = {
  db: SqlExecutor;
  api: ContentApi;
  files: FileStore;
  sha256: (bytes: Uint8Array) => Promise<string>;
  gunzip: (bytes: Uint8Array) => Uint8Array;
  now: () => number;
  selection: (resources: readonly ContentManifestResource[]) => number[];
  /** Called after a resource's rows are removed, so dependents (the reciter's downloads) can go too. */
  onResourceRemoved?: (resourceId: number, group: string) => void;
};

export type ContentSyncStatus =
  | 'skipped'
  | 'unchanged'
  | 'changes-applied'
  | 'pack-imported'
  | 'failed'
  | 'removed';

export type ContentSyncResourceReport = {
  resourceId: number;
  status: ContentSyncStatus;
  reason?: string;
};

export type ContentSyncReport = {
  resources: ContentSyncResourceReport[];
};

type InstalledResource = {
  resourceId: number;
  group: string;
  version: number;
  sha256: string;
  lastCheckedAt: number;
};

const MANIFEST_ETAG = 'manifest_etag';
const HASH_MISMATCH = 'Pack SHA-256 does not match the manifest.';

/**
 * True when the device has no catalogue yet, or an installed resource has no display name.
 * Installs from before the catalogue existed stored an ETag, so the server would answer 304
 * and the catalogue would never be written. Such a sync must ask for the manifest without it.
 */
export function catalogNeedsManifest(db: SqlExecutor): boolean {
  const row = db.get<{ catalogCount: number; unnamed: number }>(
    `SELECT
       (SELECT COUNT(*) FROM catalog_resources) AS catalogCount,
       (SELECT COUNT(*) FROM installed_resources WHERE name IS NULL AND name_ar IS NULL) AS unnamed`,
  );
  return row === undefined || row.catalogCount === 0 || row.unnamed > 0;
}

export async function syncContent(deps: ContentSyncDeps): Promise<ContentSyncReport> {
  const etag = catalogNeedsManifest(deps.db) ? undefined : readEtag(deps.db);
  const manifest = await deps.api.getManifest(etag);
  if (manifest.status === 304) {
    const checkedAt = deps.now();
    deps.db.run('UPDATE installed_resources SET last_checked_at = ?', [checkedAt]);
    return finish({
      resources: listInstalled(deps.db).map((installed) => ({
        resourceId: installed.resourceId,
        status: 'unchanged',
      })),
    });
  }

  writeCatalog(deps.db, manifest.manifest.resources);

  const report: ContentSyncResourceReport[] = [];
  let retryable = false;
  // Groups without a device schema (for example the retired translations) are ignored, not failed.
  const resources = manifest.manifest.resources.filter((resource) => contentGroup(resource.group) !== undefined);
  const published = new Set(resources.map((resource) => resource.id));
  // Tafsirs installed on demand stay selected, even though the reader's tafsir choice drops the others.
  const selected = new Set([
    ...deps.selection(resources),
    ...onDemandResourceIds(deps.db).filter((id) => published.has(id)),
  ]);

  for (const installed of listInstalled(deps.db)) {
    if (published.has(installed.resourceId) && selected.has(installed.resourceId)) {
      continue;
    }
    try {
      removeResource(deps.db, installed);
      deps.onResourceRemoved?.(installed.resourceId, installed.group);
      report.push({ resourceId: installed.resourceId, status: 'removed' });
    } catch (error) {
      retryable = true;
      report.push({ resourceId: installed.resourceId, status: 'failed', reason: errorReason(error) });
    }
  }

  for (const resource of resources) {
    if (!selected.has(resource.id)) {
      continue;
    }
    try {
      const outcome = await syncResource(deps, resource, findInstalled(deps.db, resource.id), deps.now());
      if (outcome.status === 'failed' || outcome.status === 'skipped') {
        retryable = true;
      }
      report.push(outcome);
    } catch (error) {
      retryable = true;
      report.push({ resourceId: resource.id, status: 'failed', reason: errorReason(error) });
    }
  }

  if (!retryable) {
    storeEtag(deps.db, manifest.etag);
  }

  return finish({ resources: report });
}

async function syncResource(
  deps: ContentSyncDeps,
  resource: ContentManifestResource,
  installed: InstalledResource | undefined,
  checkedAt: number,
): Promise<ContentSyncResourceReport> {
  const group = contentGroup(resource.group);
  if (group === undefined) {
    return {
      resourceId: resource.id,
      status: 'failed',
      reason: `Resource group ${resource.group} has no pack schema.`,
    };
  }

  if (installed !== undefined && installed.version === resource.version) {
    deps.db.run('UPDATE installed_resources SET last_checked_at = ? WHERE resource_id = ?', [checkedAt, resource.id]);
    return { resourceId: resource.id, status: 'unchanged' };
  }

  if (installed !== undefined && installed.version >= resource.changes_since_min_version) {
    const changes = await collectChanges(deps.api, resource.id, installed.version);
    if (changes !== 'gone') {
      applyChanges(deps.db, group, resource, changes, checkedAt);
      return { resourceId: resource.id, status: 'changes-applied' };
    }
  }

  const imported = await importPack(deps, resource, checkedAt);
  if (imported === 'skipped') {
    return { resourceId: resource.id, status: 'skipped', reason: HASH_MISMATCH };
  }
  return { resourceId: resource.id, status: 'pack-imported' };
}

async function collectChanges(
  api: ContentApi,
  resourceId: number,
  sinceVersion: number,
): Promise<ContentChange[] | 'gone'> {
  const changes: ContentChange[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await api.getChanges({ resourceId, sinceVersion, cursor });
    if (page.status === 410) {
      return 'gone';
    }
    changes.push(...page.page.data);
    const next = page.page.next_cursor;
    if (next === null || next.length === 0) {
      return changes;
    }
    if (next === cursor) {
      throw new Error('Change feed repeated a cursor.');
    }
    cursor = next;
  }
}

function applyChanges(
  db: SqlExecutor,
  group: ContentGroupSchema,
  resource: ContentManifestResource,
  changes: readonly ContentChange[],
  checkedAt: number,
): void {
  db.transaction(() => {
    for (const change of changes) {
      applyChange(db, group, resource.id, change);
    }
    // Hadith's FTS rows are derived from its entries, so a change to them reruns the group's post-import SQL.
    for (const sql of group.afterImportSql ?? []) {
      db.run(sql, [resource.id]);
    }
    db.run('UPDATE installed_resources SET version = ?, last_checked_at = ? WHERE resource_id = ?', [
      resource.version,
      checkedAt,
      resource.id,
    ]);
  });
}

function applyChange(db: SqlExecutor, group: ContentGroupSchema, resourceId: number, change: ContentChange): void {
  const entity = group.entities.find((item) => item.entity === change.entity);
  if (entity === undefined) {
    throw new Error(`Unknown entity ${change.entity}.`);
  }

  if (change.op === 'delete') {
    db.run(entity.deleteSql, [...keyValues(change.entity_key, entity.keyColumns.length), resourceId]);
    return;
  }
  if (change.op !== 'upsert') {
    throw new Error(`Unknown change op ${change.op}.`);
  }
  if (change.payload === null) {
    throw new Error(`Upsert ${change.entity} is missing a payload.`);
  }

  const table = tableFor(group, entity.table);
  if (table.columns.some((column) => column.name === 'resource_id') && change.payload.resource_id !== resourceId) {
    throw new Error(`Change for ${change.entity} does not belong to resource ${resourceId}.`);
  }

  const names = columnList(table);
  const placeholders = table.columns.map(() => '?').join(', ');
  db.run(`INSERT OR REPLACE INTO ${table.name} (${names}) VALUES (${placeholders})`, bindRow(table, change.payload));
}

/**
 * The shared pack path: download, verify the SHA-256, gunzip and import into content.db.
 * Temp files are removed on every outcome, so a cancelled or failed install leaves nothing behind.
 */
export async function importPack(
  deps: Omit<ContentSyncDeps, 'selection'>,
  resource: ContentManifestResource,
  checkedAt: number,
  options?: PackDownloadOptions,
): Promise<'pack-imported' | 'skipped'> {
  const gzipPath = packPath(deps.files.cacheDir, resource.id, resource.version, 'sqlite.gz');
  const sqlitePath = packPath(deps.files.cacheDir, resource.id, resource.version, 'sqlite');

  try {
    try {
      const url = packUrl(resource.pack.url);
      if (options === undefined) {
        await deps.api.downloadPack(url, gzipPath);
      } else {
        await deps.api.downloadPack(url, gzipPath, options);
      }
    } catch (error) {
      throw new PackDownloadError(errorReason(error));
    }
    const gzipped = await deps.files.readBytes(gzipPath);
    const actual = await deps.sha256(gzipped);
    if (actual !== resource.pack.sha256) {
      return 'skipped';
    }
    if (options?.signal?.aborted) {
      throw new Error('Pack install was cancelled.');
    }
    await deps.files.writeBytes(sqlitePath, deps.gunzip(gzipped));
    copyPack(deps.db, databasePath(sqlitePath), resource, checkedAt);
    // A pack import is a content write: screens that read content re-read after it (see useCatalogVersion).
    bumpCatalogVersion();
    return 'pack-imported';
  } finally {
    await removeQuiet(deps.files, gzipPath);
    await removeQuiet(deps.files, sqlitePath);
  }
}

function copyPack(db: SqlExecutor, path: string, resource: ContentManifestResource, checkedAt: number): void {
  const group = contentGroup(resource.group);
  if (group === undefined) {
    throw new Error(`Resource group ${resource.group} has no pack schema.`);
  }

  let attached = false;
  try {
    db.exec(`ATTACH DATABASE ${sqlString(path)} AS pack`);
    attached = true;
    assertPackMeta(db, resource.id);
    db.transaction(() => {
      for (const sql of group.deleteResourceSql) {
        db.run(sql, [resource.id]);
      }
      for (const table of group.tables) {
        const columns = columnList(table);
        db.exec(`INSERT INTO ${table.name} (${columns}) SELECT ${packSelectList(db, table)} FROM pack.${table.name}`);
      }
      for (const sql of group.afterImportSql ?? []) {
        db.run(sql, [resource.id]);
      }
      upsertInstalled(db, resource, checkedAt);
    });
  } finally {
    if (attached) {
      db.exec('DETACH DATABASE pack');
    }
  }
}

/**
 * The SELECT list for a table's pack copy. A nullable column that an older pack was built without (a column added
 * later, such as the ayah range of a partial surah) reads as NULL, so a pack built before the column still installs.
 */
function packSelectList(db: SqlExecutor, table: ContentTable): string {
  const present = new Set(db.all<{ name: string }>(`PRAGMA pack.table_info(${table.name})`).map((row) => row.name));
  if (present.size === 0) {
    return columnList(table);
  }
  return table.columns.map((column) => (column.nullable && !present.has(column.name) ? 'NULL' : column.name)).join(', ');
}

function assertPackMeta(db: SqlExecutor, resourceId: number): void {
  const schema = db.get<{ value: string }>("SELECT value FROM pack.meta WHERE key = 'pack_schema_version'");
  const packed = db.get<{ value: string }>("SELECT value FROM pack.meta WHERE key = 'resource_id'");
  if (schema?.value !== '1' || packed?.value !== String(resourceId)) {
    throw new Error('Pack schema or resource id does not match.');
  }
}

function removeResource(db: SqlExecutor, installed: InstalledResource): void {
  const group = contentGroup(installed.group);
  db.transaction(() => {
    if (group !== undefined) {
      for (const sql of group.deleteResourceSql) {
        db.run(sql, [installed.resourceId]);
      }
    }
    db.run('DELETE FROM installed_resources WHERE resource_id = ?', [installed.resourceId]);
  });
}

function upsertInstalled(db: SqlExecutor, resource: ContentManifestResource, checkedAt: number): void {
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor, name, name_ar, author_name, author_ar, language_code, direction)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(resource_id) DO UPDATE SET
       "group" = excluded."group",
       version = excluded.version,
       sha256 = excluded.sha256,
       last_checked_at = excluded.last_checked_at,
       change_cursor = NULL,
       name = excluded.name,
       name_ar = excluded.name_ar,
       author_name = excluded.author_name,
       author_ar = excluded.author_ar,
       language_code = excluded.language_code,
       direction = excluded.direction`,
    [
      resource.id,
      resource.group,
      resource.version,
      resource.pack.sha256,
      checkedAt,
      ...namesValues(resource),
    ],
  );
}

/**
 * Rewrites the device catalogue from a manifest read and refreshes the display
 * names of installed resources, so a renamed resource does not need a pack download.
 */
export function writeCatalog(db: SqlExecutor, resources: readonly ContentManifestResource[]): void {
  db.transaction(() => {
    db.run('DELETE FROM catalog_resources');
    for (const resource of resources) {
      db.run(
        `INSERT OR REPLACE INTO catalog_resources (resource_id, "group", name, name_ar, author_name, author_ar, language_code, direction, version, pack_size_bytes, is_default, style, source_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resource.id,
          resource.group,
          ...namesValues(resource),
          resource.version,
          resource.pack.size_bytes,
          // An older API omits is_default; a missing flag means not the default.
          resource.is_default === true ? 1 : 0,
          // Only recitations carry a style; a missing value (an older API) is null.
          resource.style ?? null,
          // The collection slug of a hadith resource (the manifest `key`); null when empty or absent.
          resource.key ? resource.key : null,
        ],
      );
      db.run(
        `UPDATE installed_resources
         SET name = ?, name_ar = ?, author_name = ?, author_ar = ?, language_code = ?, direction = ?
         WHERE resource_id = ?`,
        [...namesValues(resource), resource.id],
      );
    }
  });
  bumpCatalogVersion();
}

function namesValues(resource: ContentManifestResource): [string | null, string | null, string | null, string | null, string | null, string | null] {
  return [resource.name, resource.name_ar, resource.author_name, resource.author_ar, resource.language_code, resource.direction];
}

function listInstalled(db: SqlExecutor): InstalledResource[] {
  const rows = db.all<{
    resourceId: number;
    resourceGroup: string;
    version: number;
    sha256: string;
    lastCheckedAt: number;
  }>(
    `SELECT resource_id AS resourceId, "group" AS resourceGroup, version, sha256, last_checked_at AS lastCheckedAt
     FROM installed_resources
     ORDER BY resource_id`,
  );

  return rows.map((row) => ({
    resourceId: row.resourceId,
    group: row.resourceGroup,
    version: row.version,
    sha256: row.sha256,
    lastCheckedAt: row.lastCheckedAt,
  }));
}

function findInstalled(db: SqlExecutor, resourceId: number): InstalledResource | undefined {
  return listInstalled(db).find((installed) => installed.resourceId === resourceId);
}

function readEtag(db: SqlExecutor): string | undefined {
  return db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [MANIFEST_ETAG])?.value;
}

function storeEtag(db: SqlExecutor, etag: string): void {
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    MANIFEST_ETAG,
    etag,
  ]);
}

function bindRow(table: ContentTable, payload: { [key: string]: unknown }): SqlValue[] {
  return table.columns.map((column) => bindColumn(column, payload[column.name]));
}

function bindColumn(column: ContentColumn, value: unknown): SqlValue {
  if (value === undefined || value === null) {
    if (!column.nullable) {
      throw new Error(`Column ${column.name} is null.`);
    }
    return null;
  }
  if (column.kind === 'integer') {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    throw new Error(`Column ${column.name} is not an integer.`);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  throw new Error(`Column ${column.name} is not text.`);
}

function keyValues(entityKey: string, count: number): number[] {
  const parts = count === 1 ? [entityKey] : entityKey.split(':');
  if (parts.length !== count) {
    throw new Error(`Change key "${entityKey}" does not match the entity.`);
  }
  return parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Change key "${entityKey}" is not an integer.`);
    }
    return Number(part);
  });
}

function tableFor(group: ContentGroupSchema, name: string): ContentTable {
  const found = group.tables.find((item) => item.name === name);
  if (found === undefined) {
    throw new Error(`Missing table ${name}.`);
  }
  return found;
}

function packPath(cacheDir: string, resourceId: number, version: number, extension: 'sqlite.gz' | 'sqlite'): string {
  return `${cacheDir.replace(/\/+$/, '')}/packs/${resourceId}-${version}.${extension}`;
}

function databasePath(uri: string): string {
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  return decodeURIComponent(path);
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function removeQuiet(files: FileStore, path: string): Promise<void> {
  try {
    await files.remove(path);
  } catch {
    // A temp file left in the cache is recovered on the next attempt.
  }
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : 'Content sync failed.';
}

function finish(report: ContentSyncReport): ContentSyncReport {
  if (__DEV__) {
    console.log('[content-sync]', report);
  }
  return report;
}
