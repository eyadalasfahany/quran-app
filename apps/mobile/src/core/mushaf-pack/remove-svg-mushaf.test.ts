import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { File } from 'expo-file-system';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { setInstalledSvgMushaf } from './installed-store';
import type { SvgMushafFiles } from './install-svg-mushaf';
import { cleanupSvgMushafFiles, removeSvgMushaf } from './remove-svg-mushaf';
import type { InstalledSvgMushaf } from './types';

// expo-file-system is the fake from jest/fake-file-system: a file exists once written through FakeFile.writeSync.
const packs = 'file:///documents/packs';

function record(key: 'hafs' | 'warsh', version: number): InstalledSvgMushaf {
  return { key, resourceId: 9, version, sha256: 'abc', sizeBytes: 1, hasWordBoxes: false, installedAt: 1 };
}

function writeFakeFile(path: string): void {
  (new File(path) as unknown as { writeSync(text: string): void }).writeSync('x');
}

function fakeExists(path: string): boolean {
  return new File(path).exists;
}

describe('removeSvgMushaf', () => {
  beforeEach(() => {
    storage.remove(storageKeys.svgMushaf.installed('hafs'));
  });

  it('deletes the installed file with its SQLite sidecars, clears the record and bumps the catalogue', () => {
    setInstalledSvgMushaf(record('hafs', 4));
    writeFakeFile(`${packs}/svg-mushaf-hafs-4.db`);
    writeFakeFile(`${packs}/svg-mushaf-hafs-4.db-wal`);
    const before = useCatalogVersion.getState().version;

    removeSvgMushaf('hafs');

    expect(fakeExists(`${packs}/svg-mushaf-hafs-4.db`)).toBe(false);
    expect(fakeExists(`${packs}/svg-mushaf-hafs-4.db-wal`)).toBe(false);
    expect(storage.getString(storageKeys.svgMushaf.installed('hafs'))).toBeUndefined();
    expect(useCatalogVersion.getState().version).toBe(before + 1);
  });
});

describe('cleanupSvgMushafFiles', () => {
  let root: string;
  let directory: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'svg-mushaf-cleanup-'));
    directory = join(root, 'packs');
    mkdirSync(directory);
    storage.remove(storageKeys.svgMushaf.installed('hafs'));
    storage.remove(storageKeys.svgMushaf.installed('warsh'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function adapter(): SvgMushafFiles {
    const local = (path: string): string => join(directory, path.slice(path.lastIndexOf('/') + 1));
    return {
      exists: (path) => readdirSync(directory).includes(path.slice(path.lastIndexOf('/') + 1)),
      size: () => 0,
      move: () => undefined,
      remove: (path) => rmSync(local(path), { force: true }),
      list: () => readdirSync(directory).map((name) => `${packs}/${name}`),
      ensureDirectory: () => undefined,
    };
  }

  it('deletes partial downloads and stray versions, and keeps the installed file', () => {
    setInstalledSvgMushaf(record('hafs', 2));
    writeFileSync(join(directory, 'svg-mushaf-hafs-2.db'), 'installed');
    writeFileSync(join(directory, 'svg-mushaf-hafs-1.db'), 'stray');
    writeFileSync(join(directory, 'svg-mushaf-hafs-3.db.part'), 'partial');
    writeFileSync(join(directory, 'svg-mushaf-warsh-5.db'), 'no record');
    writeFileSync(join(directory, 'unrelated.txt'), 'kept');

    cleanupSvgMushafFiles(adapter());

    expect(readdirSync(directory).sort()).toEqual(['svg-mushaf-hafs-2.db', 'unrelated.txt']);
  });
});
