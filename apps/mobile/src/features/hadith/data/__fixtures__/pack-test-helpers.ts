import type { ContentManifest, ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync, gunzipSync } from 'fflate';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';
import type { ContentApi, ContentSyncDeps, FileStore } from '@/core/sync/content-sync';
import type { InstallDeps } from '@/core/sync/install-resource';
import { contentGroup, type ContentTable } from '@/core/sync/content-tables';

import { applyContentMigrations } from '../../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../../jest/node-sqlite-executor';

/**
 * TEST ONLY. Builds gzipped hadith packs and the install dependencies for `install.test.ts`. The pack rows are
 * placeholders supplied by the test; nothing here writes hadith text.
 */

export const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
export const NOW = 1_700_000_000_000;

export type HadithPackRows = Partial<Record<string, Record<string, SqlValue>[]>>;

export function sha256(bytes: Uint8Array): Promise<string> {
  return Promise.resolve(createHash('sha256').update(bytes).digest('hex'));
}

export function resource(
  overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id'>,
): ContentManifestResource {
  return {
    key: 'fixture-collection',
    group: 'hadith_collections',
    name: 'FIXTURE title — not a hadith',
    name_ar: null,
    author_name: 'FIXTURE author',
    author_ar: null,
    is_default: false,
    style: null,
    language_code: 'ar',
    direction: 'rtl',
    version: 1,
    pack: { url: `/api/v1/content/packs/${overrides.id}/1`, size_bytes: 1, sha256: 'abc' },
    changes_since_min_version: 1,
    ...overrides,
  };
}

export function manifestBody(resources: ContentManifestResource[]): ContentManifest {
  return { generated_at: '2026-11-07T00:00:00.000Z', pack_schema_version: 1, resources };
}

function columnType(kind: 'integer' | 'text'): string {
  return kind === 'integer' ? 'INTEGER' : 'TEXT';
}

function createTable(database: DatabaseSync, table: ContentTable): void {
  const columns = table.columns.map((column) => {
    const name = column.name === 'match' ? `"${column.name}"` : column.name;
    return `${name} ${columnType(column.kind)}${column.nullable ? '' : ' NOT NULL'}`;
  });
  database.exec(`CREATE TABLE ${table.name} (${columns.join(', ')})`);
}

/**
 * A gzipped hadith pack (collections or explanations) for `resourceId`. Each table of the hadith group is created with the columns of
 * `content-tables.ts`, so the test cannot drift from the device schema. A table that the test leaves out is not created.
 */
export function gzipHadithPack(
  resourceId: number,
  rows: HadithPackRows,
  groupName: 'hadith_collections' | 'hadith_explanations' = 'hadith_collections',
): Uint8Array {
  const group = contentGroup(groupName);
  if (group === undefined) {
    throw new Error(`The ${groupName} group is missing.`);
  }
  const directory = mkdtempSync(join(tmpdir(), 'hadith-pack-'));
  const path = join(directory, 'pack.sqlite');
  try {
    const database = new DatabaseSync(path);
    database.exec('PRAGMA journal_mode = DELETE');
    database.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('pack_schema_version', '1');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('resource_id', String(resourceId));

    for (const table of group.tables) {
      const tableRows = rows[table.name];
      if (tableRows === undefined) {
        continue;
      }
      createTable(database, table);
      const names = table.columns.map((column) => column.name);
      const quoted = names.map((name) => (name === 'match' ? '"match"' : name));
      const placeholders = names.map(() => '?').join(', ');
      const insert = database.prepare(`INSERT INTO ${table.name} (${quoted.join(', ')}) VALUES (${placeholders})`);
      for (const row of tableRows) {
        insert.run(...names.map((name) => (row[name] ?? null) as SqlValue));
      }
    }

    database.close();
    return gzipSync(new Uint8Array(readFileSync(path)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function fileStore(cacheDir: string): FileStore {
  return {
    cacheDir,
    async readBytes(path) {
      return new Uint8Array(readFileSync(path));
    },
    async writeBytes(path, bytes) {
      mkdirSync(parentDir(path), { recursive: true });
      writeFileSync(path, bytes);
    },
    async remove(path) {
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
    },
  };
}

export function parentDir(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '.' : path.slice(0, index);
}

export function packIdFromUrl(url: string): number {
  const match = /\/packs\/(\d+)\//.exec(url);
  if (match === null) {
    throw new Error(`Unexpected pack url ${url}`);
  }
  return Number(match[1]);
}

export function serveFrom(packs: Map<number, Uint8Array>): ContentApi['downloadPack'] {
  return async (url, toPath, options) => {
    const bytes = packs.get(packIdFromUrl(url));
    if (bytes === undefined) {
      throw new Error('network down');
    }
    mkdirSync(parentDir(toPath), { recursive: true });
    writeFileSync(toPath, bytes);
    options?.onProgress?.(1);
  };
}

export function apiWith(body: ContentManifest, downloadPack: ContentApi['downloadPack']): ContentApi {
  return {
    getManifest: async () => ({ status: 200, etag: '"manifest"', manifest: body }),
    getChanges: async () => {
      throw new Error('changes');
    },
    downloadPack,
  };
}

export function installDeps(executor: SqlExecutor, cacheDir: string, api: ContentApi): InstallDeps {
  return {
    db: executor,
    api,
    files: fileStore(cacheDir),
    sha256,
    gunzip: (bytes) => gunzipSync(bytes),
    now: () => NOW,
  };
}

export function syncDeps(
  executor: SqlExecutor,
  cacheDir: string,
  api: ContentApi,
  selection: ContentSyncDeps['selection'],
): ContentSyncDeps {
  return { ...installDeps(executor, cacheDir, api), selection };
}

/** An in-memory content.db with every migration applied, and a cache directory that is removed afterwards. */
export async function withContentDb(
  run: (context: { executor: SqlExecutor; cacheDir: string; database: DatabaseSync }) => Promise<void>,
): Promise<void> {
  const cacheDir = mkdtempSync(join(tmpdir(), 'hadith-cache-'));
  const opened = openNodeSqlite(':memory:');
  applyContentMigrations(opened.executor, migrationsDir);
  try {
    await run({ executor: opened.executor, cacheDir, database: opened.database });
  } finally {
    opened.database.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
}
