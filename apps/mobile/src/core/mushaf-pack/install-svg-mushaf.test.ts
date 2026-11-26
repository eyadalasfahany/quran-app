import type { ContentManifestResource } from '@quran/api-contract';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { NetworkStateType, type NetworkState } from 'expo-network';

import { openNodeSqlite } from '../../../jest/node-sqlite-executor';
import { buildSvgMushafPackFile } from '../../../jest/svg-mushaf-pack-fixture';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import * as installedStore from './installed-store';
import { installSvgMushafWith, type SvgMushafFiles, type SvgMushafInstallDeps } from './install-svg-mushaf';
import { SvgMushafPackReader } from './SvgMushafPackReader';

// The installer's paths start at the fake document directory (`file:///documents`). The adapter maps them onto a temp root.
const DOCUMENTS = 'file:///documents';

// The pack url is resolved against the API base, which must be set for the download step.
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';

let root: string;
let fixtures: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'svg-mushaf-install-'));
  fixtures = join(root, 'fixtures');
  mkdirSync(fixtures);
  storage.remove(storageKeys.svgMushaf.installed('hafs'));
});

// Every database a test opens, closed before the temp root is removed (Windows cannot delete an open SQLite file).
const openDatabases: DatabaseSync[] = [];

function open(path: string): ReturnType<typeof openNodeSqlite> {
  const opened = openNodeSqlite(path);
  openDatabases.push(opened.database);
  return opened;
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed by the pack reader.
    }
  }
  rmSync(root, { recursive: true, force: true });
});

function local(path: string): string {
  return join(root, 'docs', path.replace(`${DOCUMENTS}/`, ''));
}

function sha256Of(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** A pack file for the given version, and the manifest entry that describes it. */
function packFixture(version: number, options: { key?: string; withWordBoxes?: boolean; sha?: string; size?: number; legacySchema1?: boolean } = {}) {
  const file = join(fixtures, `hafs-${version}-${options.key ?? 'hafs'}.db`);
  buildSvgMushafPackFile(file, { key: options.key ?? 'hafs', legacySchema1: options.legacySchema1, resourceId: 9, version, withWordBoxes: options.withWordBoxes });
  const resource: ContentManifestResource = {
    id: 9,
    group: 'svg_mushafs',
    key: 'hafs',
    name: 'Hafs from Asim',
    name_ar: 'حفص عن عاصم',
    author_name: null,
    author_ar: null,
    is_default: false,
    has_word_boxes: options.withWordBoxes === true,
    style: null,
    language_code: 'ar',
    direction: 'rtl',
    version,
    pack: {
      url: `/api/v1/content/packs/9/${version}`,
      size_bytes: options.size ?? statSync(file).size,
      sha256: options.sha ?? sha256Of(file),
    },
    changes_since_min_version: version,
  };
  return { file, resource };
}

type Setup = {
  deps: SvgMushafInstallDeps;
  files: SvgMushafFiles & { remove: jest.Mock };
  downloadPack: jest.Mock;
  sqlRecorded: string[];
  setResources: (resources: ContentManifestResource[]) => void;
  setNetwork: (state: NetworkState) => void;
  setWifiOnly: (on: boolean) => void;
};

function setup(): Setup {
  const { database, executor } = open(join(root, 'catalog.db'));
  database.exec(
    `CREATE TABLE catalog_resources (resource_id INTEGER PRIMARY KEY, "group" TEXT NOT NULL, name TEXT, name_ar TEXT, author_name TEXT,
      author_ar TEXT, language_code TEXT, direction TEXT, version INTEGER NOT NULL, pack_size_bytes INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0, style TEXT, source_key TEXT);
     CREATE TABLE installed_resources (resource_id INTEGER PRIMARY KEY, name TEXT, name_ar TEXT, author_name TEXT, author_ar TEXT,
      language_code TEXT, direction TEXT);`,
  );

  const sqlRecorded: string[] = [];
  const recording: SqlExecutor = {
    exec: (sql) => {
      sqlRecorded.push(sql);
      executor.exec(sql);
    },
    run: (sql, params) => {
      sqlRecorded.push(sql);
      executor.run(sql, params);
    },
    get: executor.get,
    all: executor.all,
    transaction: executor.transaction,
  };

  let resources: ContentManifestResource[] = [];
  let network: NetworkState = { isConnected: true, type: NetworkStateType.WIFI, isInternetReachable: true };
  let wifiOnly = false;

  const files = {
    exists: (path: string) => existsSync(local(path)),
    size: (path: string) => statSync(local(path)).size,
    move: (from: string, to: string) => renameSync(local(from), local(to)),
    remove: jest.fn((path: string) => rmSync(local(path), { force: true })),
    list: (directory: string) => (existsSync(local(directory)) ? readdirSync(local(directory)).map((name) => `${directory}/${name}`) : []),
    ensureDirectory: (directory: string) => mkdirSync(local(directory), { recursive: true }),
  };

  // Each test decides what the download delivers (see useDownloads).
  const downloadPack = jest.fn(async (_url: string, _toPath: string, _options?: { onProgress?: (f: number) => void }) => undefined);

  const deps: SvgMushafInstallDeps = {
    api: {
      getManifest: jest.fn(async () => ({
        status: 200 as const,
        etag: '"etag"',
        manifest: { generated_at: '2026-11-15T00:00:00.000Z', pack_schema_version: 1, resources },
      })),
      downloadPack,
    },
    db: recording,
    files,
    sha256File: (path) => Promise.resolve(sha256Of(local(path))),
    openPack: (path) => {
      const opened = open(local(path));
      return new SvgMushafPackReader(opened.executor, () => opened.database.close());
    },
    network: () => Promise.resolve(network),
    wifiOnly: () => wifiOnly,
    now: () => 1_700_000_000_000,
  };

  return {
    deps,
    files,
    downloadPack,
    sqlRecorded,
    setResources: (next) => {
      resources = next;
    },
    setNetwork: (next) => {
      network = next;
    },
    setWifiOnly: (on) => {
      wifiOnly = on;
    },
  };
}

/** The manifest lists this resource, and the download delivers this pack file. */
function useDownloads(s: Setup, entry: { pack: { file: string }; resource: ContentManifestResource }): void {
  s.setResources([entry.resource]);
  s.downloadPack.mockImplementation(async (_url: string, toPath: string, options?: { onProgress?: (f: number) => void }) => {
    options?.onProgress?.(0.5);
    copyFileSync(entry.pack.file, local(toPath));
    options?.onProgress?.(1);
  });
}

describe('installSvgMushafWith', () => {
  it('downloads, checks, records and reports progress to 1; a second call for the same version does not download', async () => {
    const s = setup();
    const pack = packFixture(1, { withWordBoxes: true });
    useDownloads(s, { pack, resource: pack.resource });
    const progress: number[] = [];

    const result = await installSvgMushafWith(s.deps, 'hafs', { onProgress: (f) => progress.push(f) });

    expect(result).toEqual({ status: 'installed' });
    expect(progress.at(-1)).toBe(1);
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db'))).toBe(true);
    expect(installedStore.getInstalledSvgMushaf('hafs')).toMatchObject({ version: 1, hasWordBoxes: true, pageFormat: 'tqp1-deflate-n32', resourceId: 9 });

    const again = await installSvgMushafWith(s.deps, 'hafs');
    expect(again).toEqual({ status: 'installed' });
    expect(s.downloadPack).toHaveBeenCalledTimes(1);
  });

  it('removes the partial file and keeps the installed version on a checksum mismatch', async () => {
    const s = setup();
    const good = packFixture(1);
    useDownloads(s, { pack: good, resource: good.resource });
    expect((await installSvgMushafWith(s.deps, 'hafs')).status).toBe('installed');

    const bad = packFixture(2, { sha: '0'.repeat(64) });
    useDownloads(s, { pack: bad, resource: bad.resource });
    const result = await installSvgMushafWith(s.deps, 'hafs');

    expect(result).toEqual({ status: 'failed', reason: 'checksum' });
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-2.db.part'))).toBe(false);
    expect(installedStore.getInstalledSvgMushaf('hafs')?.version).toBe(1);
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db'))).toBe(true);
  });

  it('fails with a size error when the downloaded bytes are not the advertised size', async () => {
    const s = setup();
    const pack = packFixture(1, { size: 1 });
    useDownloads(s, { pack, resource: pack.resource });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'failed', reason: 'size' });
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db.part'))).toBe(false);
  });

  it('refuses a schema-1 pack (no TQP1 pages), removes it, and keeps the old version', async () => {
    const s = setup();
    const good = packFixture(1);
    useDownloads(s, { pack: good, resource: good.resource });
    await installSvgMushafWith(s.deps, 'hafs');

    const old = packFixture(2, { legacySchema1: true });
    useDownloads(s, { pack: old, resource: old.resource });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'failed', reason: 'import' });
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-2.db'))).toBe(false);
    expect(installedStore.getInstalledSvgMushaf('hafs')?.version).toBe(1);
  });

  it('refuses a pack that names another riwayah, removes it, and keeps the old version', async () => {
    const s = setup();
    const good = packFixture(1);
    useDownloads(s, { pack: good, resource: good.resource });
    await installSvgMushafWith(s.deps, 'hafs');

    const wrong = packFixture(2, { key: 'warsh' });
    useDownloads(s, { pack: wrong, resource: wrong.resource });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'failed', reason: 'import' });
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-2.db'))).toBe(false);
    expect(installedStore.getInstalledSvgMushaf('hafs')?.version).toBe(1);
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db'))).toBe(true);
  });

  it('returns cancelled and leaves no partial file when the signal aborts mid-download', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: pack.resource });
    const controller = new AbortController();
    s.downloadPack.mockImplementationOnce(async (_url: string, toPath: string) => {
      writeFileSync(local(toPath), 'partial');
      controller.abort();
      throw new Error('aborted');
    });

    const result = await installSvgMushafWith(s.deps, 'hafs', { signal: controller.signal });

    expect(result).toEqual({ status: 'cancelled' });
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db.part'))).toBe(false);
  });

  it('waits for Wi-Fi on cellular when Wi-Fi only is on, and proceeds with allowCellular', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: pack.resource });
    s.setWifiOnly(true);
    s.setNetwork({ isConnected: true, type: NetworkStateType.CELLULAR, isInternetReachable: true });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'waiting_wifi' });
    expect(s.downloadPack).not.toHaveBeenCalled();

    expect(await installSvgMushafWith(s.deps, 'hafs', { allowCellular: true })).toEqual({ status: 'installed' });
    expect(s.downloadPack).toHaveBeenCalledTimes(1);
  });

  it('fails with a network error when offline', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: pack.resource });
    s.setNetwork({ isConnected: false, type: NetworkStateType.NONE, isInternetReachable: false });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'failed', reason: 'network' });
    expect(s.downloadPack).not.toHaveBeenCalled();
  });

  it('deletes the old version and its SQLite sidecar only after the record points at the new one', async () => {
    const s = setup();
    const first = packFixture(1);
    useDownloads(s, { pack: first, resource: first.resource });
    await installSvgMushafWith(s.deps, 'hafs');
    writeFileSync(local('file:///documents/packs/svg-mushaf-hafs-1.db-wal'), 'wal');

    const second = packFixture(2);
    useDownloads(s, { pack: second, resource: second.resource });
    const setSpy = jest.spyOn(installedStore, 'setInstalledSvgMushaf');
    s.files.remove.mockClear();

    expect((await installSvgMushafWith(s.deps, 'hafs')).status).toBe('installed');

    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db'))).toBe(false);
    expect(existsSync(local('file:///documents/packs/svg-mushaf-hafs-1.db-wal'))).toBe(false);
    const removeIndex = s.files.remove.mock.calls.findIndex((call) => String(call[0]).endsWith('svg-mushaf-hafs-1.db'));
    expect(removeIndex).toBeGreaterThanOrEqual(0);
    expect(setSpy.mock.invocationCallOrder[0]).toBeLessThan(s.files.remove.mock.invocationCallOrder[removeIndex] as number);
    setSpy.mockRestore();
  });

  it('shares one download between two concurrent calls', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: pack.resource });

    const first = installSvgMushafWith(s.deps, 'hafs');
    const second = installSvgMushafWith(s.deps, 'hafs');

    expect(second).toBe(first);
    await expect(first).resolves.toEqual({ status: 'installed' });
    expect(s.downloadPack).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when the manifest has no entry for the riwayah', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: { ...pack.resource, key: 'warsh' } });

    expect(await installSvgMushafWith(s.deps, 'hafs')).toEqual({ status: 'failed', reason: 'unavailable' });
  });

  it('never issues ATTACH against the content database', async () => {
    const s = setup();
    const pack = packFixture(1);
    useDownloads(s, { pack, resource: pack.resource });

    await installSvgMushafWith(s.deps, 'hafs');

    expect(s.sqlRecorded.some((sql) => /\bATTACH\b/i.test(sql))).toBe(false);
  });
});
