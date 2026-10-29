import type { ContentManifest, ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync, gunzipSync } from 'fflate';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import type { ContentApi, ContentSyncDeps, FileStore, PackDownloadOptions } from '@/core/sync/content-sync';
import { syncContent } from '@/core/sync/content-sync';
import { installResourceWith, type InstallDeps } from '@/core/sync/install-resource';
import { selectedResourceIds } from '@/core/sync/selection';
import { resetReaderSettingsStore } from '@/features/reader/settings';
import { readReaderSettings, writeReaderSettings } from '@/features/reader/settings-model';

import { applyContentMigrations } from '../jest/apply-content-migrations';
import { openNodeSqlite } from '../jest/node-sqlite-executor';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const EXACT = 'ٱلرَّحْمَـٰنِ‏ٱلرَّحِيمِ';
const NOW = 1_700_000_000_000;

type TafsirRow = { groupTafsirId: number; html: string };

function sha256(bytes: Uint8Array): Promise<string> {
  return Promise.resolve(createHash('sha256').update(bytes).digest('hex'));
}

function resource(overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id'>): ContentManifestResource {
  return {
    group: 'tafsirs',
    name: 'Test',
    name_ar: 'اختبار',
    author_name: 'Author',
    author_ar: null,
    is_default: false,
    language_code: 'ar',
    direction: 'rtl',
    version: 1,
    pack: { url: `/api/v1/content/packs/${overrides.id}/1`, size_bytes: 1, sha256: 'abc' },
    changes_since_min_version: 1,
    ...overrides,
  };
}

function manifestBody(resources: ContentManifestResource[]): ContentManifest {
  return { generated_at: '2026-10-27T00:00:00.000Z', pack_schema_version: 1, resources };
}

function gzipPack(resourceId: number, rows: TafsirRow[]): Uint8Array {
  const directory = mkdtempSync(join(tmpdir(), 'install-pack-'));
  const path = join(directory, 'pack.sqlite');
  try {
    const database = new DatabaseSync(path);
    database.exec('PRAGMA journal_mode = DELETE');
    database.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('pack_schema_version', '1');
    database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('resource_id', String(resourceId));
    database.exec(
      `CREATE TABLE tafsir_entries (
        resource_id INTEGER NOT NULL,
        group_tafsir_id INTEGER NOT NULL,
        first_verse_id INTEGER NOT NULL,
        last_verse_id INTEGER NOT NULL,
        html TEXT NOT NULL,
        PRIMARY KEY (resource_id, group_tafsir_id)
      )`,
    );
    const insert = database.prepare(
      'INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html) VALUES (?, ?, 1, 7, ?)',
    );
    for (const row of rows) {
      insert.run(resourceId, row.groupTafsirId, row.html);
    }
    database.close();
    return gzipSync(new Uint8Array(readFileSync(path)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function fileStore(cacheDir: string): FileStore {
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

function parentDir(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '.' : path.slice(0, index);
}

function packIdFromUrl(url: string): number {
  const match = /\/packs\/(\d+)\//.exec(url);
  if (match === null) {
    throw new Error(`Unexpected pack url ${url}`);
  }
  return Number(match[1]);
}

function serveFrom(packs: Map<number, Uint8Array>): ContentApi['downloadPack'] {
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

function apiWith(body: ContentManifest, downloadPack: ContentApi['downloadPack']): ContentApi {
  return {
    getManifest: async () => ({ status: 200, etag: '"manifest"', manifest: body }),
    getChanges: async () => {
      throw new Error('changes');
    },
    downloadPack,
  };
}

function installDeps(executor: SqlExecutor, cacheDir: string, api: ContentApi): InstallDeps {
  return {
    db: executor,
    api,
    files: fileStore(cacheDir),
    sha256,
    gunzip: (bytes) => gunzipSync(bytes),
    now: () => NOW,
  };
}

function syncDeps(
  executor: SqlExecutor,
  cacheDir: string,
  api: ContentApi,
  selection: ContentSyncDeps['selection'],
): ContentSyncDeps {
  return { ...installDeps(executor, cacheDir, api), selection };
}

async function withContentDb(
  run: (context: { executor: SqlExecutor; cacheDir: string }) => Promise<void>,
): Promise<void> {
  const cacheDir = mkdtempSync(join(tmpdir(), 'install-cache-'));
  const opened = openNodeSqlite(':memory:');
  applyContentMigrations(opened.executor, migrationsDir);
  try {
    await run({ executor: opened.executor, cacheDir });
  } finally {
    opened.database.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

function installedRow(executor: SqlExecutor, resourceId: number): { version: number; group: string } | undefined {
  return executor.get<{ version: number; group: string }>(
    'SELECT version, "group" AS "group" FROM installed_resources WHERE resource_id = ?',
    [resourceId],
  );
}

function tafsirRowCount(executor: SqlExecutor, resourceId: number): number {
  return (
    executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM tafsir_entries WHERE resource_id = ?', [resourceId])
      ?.count ?? 0
  );
}

function leftoverPackFiles(cacheDir: string, resourceId: number): boolean {
  return ['sqlite.gz', 'sqlite'].some((extension) => existsSync(join(cacheDir, 'packs', `${resourceId}-1.${extension}`)));
}

describe('installResource', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalUrl;
    }
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.selectedResourceIds);
    resetReaderSettingsStore();
    jest.restoreAllMocks();
  });

  it('installs one resource, reports progress to 1, and makes the first tafsir the reader choice', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const entry = resource({ id: 85, pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: await sha256(bytes) } });
    const progress: number[] = [];

    await withContentDb(async ({ executor, cacheDir }) => {
      const downloadPack = jest.fn(async (url: string, toPath: string, options?: PackDownloadOptions) => {
        mkdirSync(parentDir(toPath), { recursive: true });
        writeFileSync(toPath, bytes);
        options?.onProgress?.(0.5);
        options?.onProgress?.(1);
      });

      const result = await installResourceWith(installDeps(executor, cacheDir, apiWith(manifestBody([entry]), downloadPack)), 85, {
        onProgress: (fraction) => progress.push(fraction),
      });

      expect(result).toEqual({ status: 'installed' });
      expect(progress).toEqual([0, 0.45, 0.9, 1]);
      expect(downloadPack).toHaveBeenCalledWith('http://localhost:8000/api/v1/content/packs/85/1', expect.any(String), expect.anything());
      expect(tafsirRowCount(executor, 85)).toBe(1);
      expect(installedRow(executor, 85)).toEqual({ version: 1, group: 'tafsirs' });
      expect(leftoverPackFiles(cacheDir, 85)).toBe(false);
      expect(readReaderSettings()).toMatchObject({ tafsirChosen: true, tafsirId: 85 });
    });
  });

  it('leaves nothing installed when cancelled during the download', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const entry = resource({ id: 85, pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: await sha256(bytes) } });
    const controller = new AbortController();

    await withContentDb(async ({ executor, cacheDir }) => {
      const downloadPack = async (_url: string, toPath: string) => {
        mkdirSync(parentDir(toPath), { recursive: true });
        writeFileSync(toPath, new Uint8Array([1, 2, 3]));
        controller.abort();
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      };

      const result = await installResourceWith(installDeps(executor, cacheDir, apiWith(manifestBody([entry]), downloadPack)), 85, {
        signal: controller.signal,
      });

      expect(result).toEqual({ status: 'cancelled' });
      expect(leftoverPackFiles(cacheDir, 85)).toBe(false);
      expect(installedRow(executor, 85)).toBeUndefined();
      expect(tafsirRowCount(executor, 85)).toBe(0);
      expect(readReaderSettings().tafsirChosen).toBe(false);
    });
  });

  it('leaves nothing installed when the pack fails its checksum', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const entry = resource({
      id: 85,
      pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: await sha256(new Uint8Array([9])) },
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      const result = await installResourceWith(
        installDeps(executor, cacheDir, apiWith(manifestBody([entry]), serveFrom(new Map([[85, bytes]])))),
        85,
      );

      expect(result).toEqual({ status: 'failed', reason: 'checksum' });
      expect(leftoverPackFiles(cacheDir, 85)).toBe(false);
      expect(installedRow(executor, 85)).toBeUndefined();
      expect(tafsirRowCount(executor, 85)).toBe(0);
      expect(readReaderSettings().tafsirChosen).toBe(false);
    });
  });

  it('reports a network failure and leaves nothing installed', async () => {
    const entry = resource({ id: 85, pack: { url: '/api/v1/content/packs/85/1', size_bytes: 1, sha256: 'abc' } });

    await withContentDb(async ({ executor, cacheDir }) => {
      const result = await installResourceWith(
        installDeps(executor, cacheDir, apiWith(manifestBody([entry]), serveFrom(new Map()))),
        85,
      );

      expect(result).toEqual({ status: 'failed', reason: 'network' });
      expect(installedRow(executor, 85)).toBeUndefined();
    });
  });

  it('shares one promise between concurrent calls for the same resource', async () => {
    const bytes = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const entry = resource({ id: 85, pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes.byteLength, sha256: await sha256(bytes) } });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await withContentDb(async ({ executor, cacheDir }) => {
      const downloadPack = jest.fn(async (_url: string, toPath: string) => {
        await gate;
        mkdirSync(parentDir(toPath), { recursive: true });
        writeFileSync(toPath, bytes);
      });
      const deps = installDeps(executor, cacheDir, apiWith(manifestBody([entry]), downloadPack));

      const first = installResourceWith(deps, 85);
      const second = installResourceWith(deps, 85);
      expect(second).toBe(first);

      release();
      await expect(first).resolves.toEqual({ status: 'installed' });
      expect(downloadPack).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the on-demand install through a later syncContent, even when another tafsir is chosen', async () => {
    const bytes85 = gzipPack(85, [{ groupTafsirId: 1, html: EXACT }]);
    const bytes86 = gzipPack(86, [{ groupTafsirId: 2, html: 'second' }]);
    const entry85 = resource({ id: 85, pack: { url: '/api/v1/content/packs/85/1', size_bytes: bytes85.byteLength, sha256: await sha256(bytes85) } });
    const entry86 = resource({ id: 86, pack: { url: '/api/v1/content/packs/86/1', size_bytes: bytes86.byteLength, sha256: await sha256(bytes86) } });
    const body = manifestBody([entry85, entry86]);
    const packs = new Map([
      [85, bytes85],
      [86, bytes86],
    ]);

    await withContentDb(async ({ executor, cacheDir }) => {
      const installed = await installResourceWith(installDeps(executor, cacheDir, apiWith(body, serveFrom(packs))), 85);
      expect(installed).toEqual({ status: 'installed' });

      // The reader later chooses another tafsir. The override drops 85 from the base selection.
      writeReaderSettings({ mode: 'reading', fontScale: 1, tafsirChosen: true, tafsirId: 86 });

      const report = await syncContent(syncDeps(executor, cacheDir, apiWith(body, serveFrom(packs)), selectedResourceIds));

      expect(report.resources).not.toContainEqual(expect.objectContaining({ resourceId: 85, status: 'removed' }));
      expect(report.resources).toContainEqual({ resourceId: 85, status: 'unchanged' });
      expect(report.resources).toContainEqual({ resourceId: 86, status: 'pack-imported' });
      expect(installedRow(executor, 85)).toEqual({ version: 1, group: 'tafsirs' });
    });
  });
});
