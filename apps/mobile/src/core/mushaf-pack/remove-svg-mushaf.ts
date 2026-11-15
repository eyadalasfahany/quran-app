import { bumpCatalogVersion } from '../sync/catalog-version';
import { closeSvgMushafPack } from './open-pack';
import { clearInstalledSvgMushaf, getInstalledSvgMushaf } from './installed-store';
import { deviceSvgMushafFiles, fileName, type SvgMushafFiles } from './install-svg-mushaf';
import { svgMushafPackDirectory, svgMushafPackPath } from './paths';
import { SVG_MUSHAF_KEYS, type SvgMushafKey } from './types';

const SIDECARS = ['', '-wal', '-shm', '-journal'];

/** Removes the installed version of one riwayah: the connection, the file and its SQLite sidecars, then the record. */
export function removeSvgMushaf(key: SvgMushafKey): void {
  closeSvgMushafPack(key);
  const record = getInstalledSvgMushaf(key);
  if (record !== undefined) {
    deleteWithSidecars(deviceSvgMushafFiles(), svgMushafPackPath(key, record.version));
  }
  clearInstalledSvgMushaf(key);
  bumpCatalogVersion();
}

/**
 * Startup housekeeping (wired by step 7): deletes every partial download, and every svg-mushaf pack file that is not the
 * installed record's file for its key.
 */
export function cleanupSvgMushafFiles(files: SvgMushafFiles = deviceSvgMushafFiles()): void {
  const keep = new Set<string>();
  for (const key of SVG_MUSHAF_KEYS) {
    const record = getInstalledSvgMushaf(key);
    if (record !== undefined) {
      keep.add(fileName(svgMushafPackPath(key, record.version)));
    }
  }

  for (const path of files.list(svgMushafPackDirectory())) {
    const name = fileName(path);
    if (!name.startsWith('svg-mushaf-')) {
      continue;
    }
    if (name.endsWith('.part') || !keep.has(name)) {
      try {
        files.remove(path);
      } catch {
        // A file that cannot be removed now is tried again at the next start.
      }
    }
  }
}

function deleteWithSidecars(files: SvgMushafFiles, path: string): void {
  for (const suffix of SIDECARS) {
    try {
      files.remove(`${path}${suffix}`);
    } catch {
      // Best effort: a leftover sidecar is removed by the next cleanup.
    }
  }
}
