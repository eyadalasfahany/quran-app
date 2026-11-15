import type { ContentManifestResource } from '@quran/api-contract';
import { Directory, File } from 'expo-file-system';
import { getNetworkStateAsync, NetworkStateType, type NetworkState } from 'expo-network';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import { getManifest, packUrl } from '../api/content';
import { bumpCatalogVersion } from '../sync/catalog-version';
import { writeCatalog, type ContentApi } from '../sync/content-sync';
import { downloadPack } from '../sync/device-sync';
import { closeSvgMushafPack, openSvgMushafPackAt } from './open-pack';
import { sha256File } from './hash-file';
import { getInstalledSvgMushaf, setInstalledSvgMushaf } from './installed-store';
import { svgMushafPackDirectory, svgMushafPackPath, svgMushafPartPath } from './paths';
import type { SvgMushafPackReader } from './SvgMushafPackReader';
import type { SvgMushafInstallResult, SvgMushafKey } from './types';

/** Filesystem seam: the device wraps expo-file-system, the tests wrap a temporary directory. */
export type SvgMushafFiles = {
  exists(path: string): boolean;
  size(path: string): number;
  move(from: string, to: string): void;
  /** Deletes a file, or does nothing when it is absent. */
  remove(path: string): void;
  list(directory: string): string[];
  ensureDirectory(directory: string): void;
};

export type SvgMushafInstallDeps = {
  api: Pick<ContentApi, 'getManifest' | 'downloadPack'>;
  db: SqlExecutor;
  files: SvgMushafFiles;
  sha256File: (path: string) => Promise<string>;
  openPack: (path: string) => SvgMushafPackReader;
  network: () => Promise<NetworkState>;
  wifiOnly: () => boolean;
  now: () => number;
};

export type SvgMushafInstallOptions = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  /** Downloads over cellular for this one call, even when Wi-Fi only is on. */
  allowCellular?: boolean;
};

// Download is 0..0.9 of the progress; hashing sits at 0.92; the switch is 1.
const DOWNLOAD_SHARE = 0.9;
const VERIFYING_FRACTION = 0.92;

// One install per riwayah at a time. A second caller gets the same promise.
const inFlight = new Map<SvgMushafKey, Promise<SvgMushafInstallResult>>();

export function installSvgMushafWith(
  deps: SvgMushafInstallDeps,
  key: SvgMushafKey,
  options: SvgMushafInstallOptions = {},
): Promise<SvgMushafInstallResult> {
  const running = inFlight.get(key);
  if (running !== undefined) {
    return running;
  }
  const promise = runInstall(deps, key, options).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** The device install: expo-file-system, expo-sqlite, expo-network and the Wi-Fi setting. */
export function installSvgMushaf(key: SvgMushafKey, options: SvgMushafInstallOptions = {}): Promise<SvgMushafInstallResult> {
  return installSvgMushafWith(
    {
      api: { getManifest, downloadPack },
      db: openContentDb().executor,
      files: deviceSvgMushafFiles(),
      sha256File,
      openPack: openSvgMushafPackAt,
      network: getNetworkStateAsync,
      wifiOnly: getWifiOnlyDownloads,
      now: Date.now,
    },
    key,
    options,
  );
}

/** The expo-file-system adapter. Paths may carry the `file://` prefix. */
export function deviceSvgMushafFiles(): SvgMushafFiles {
  return {
    exists: (path) => new File(path).exists,
    size: (path) => new File(path).size ?? 0,
    move: (from, to) => {
      // moveSync: `move` is async in expo-file-system 58, so the `.part` cleanup ran before the move and it failed.
      new File(from).moveSync(new File(to));
    },
    remove: (path) => {
      const file = new File(path);
      if (file.exists) {
        file.delete();
      }
    },
    list: (directory) => {
      const dir = new Directory(directory);
      return dir.exists ? dir.list().map((entry) => entry.uri) : [];
    },
    ensureDirectory: (directory) => {
      const dir = new Directory(directory);
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
    },
  };
}

async function runInstall(deps: SvgMushafInstallDeps, key: SvgMushafKey, options: SvgMushafInstallOptions): Promise<SvgMushafInstallResult> {
  const { onProgress, signal } = options;
  if (signal?.aborted) {
    return { status: 'cancelled' };
  }

  let resource: ContentManifestResource | undefined;
  try {
    const manifest = await deps.api.getManifest(undefined, signal);
    if (manifest.status !== 200) {
      return { status: 'failed', reason: 'network' };
    }
    writeCatalog(deps.db, manifest.manifest.resources);
    bumpCatalogVersion();
    resource = manifest.manifest.resources.find((item) => item.group === 'svg_mushafs' && item.key === key);
  } catch {
    return signal?.aborted ? { status: 'cancelled' } : { status: 'failed', reason: 'network' };
  }
  if (resource === undefined) {
    return { status: 'failed', reason: 'unavailable' };
  }

  let state: NetworkState;
  try {
    state = await deps.network();
  } catch {
    return { status: 'failed', reason: 'network' };
  }
  if (state.isConnected !== true) {
    return { status: 'failed', reason: 'network' };
  }
  if (deps.wifiOnly() && options.allowCellular !== true && state.type !== NetworkStateType.WIFI) {
    return { status: 'waiting_wifi' };
  }

  const finalPath = svgMushafPackPath(key, resource.version);
  const installed = getInstalledSvgMushaf(key);
  if (
    installed !== undefined &&
    installed.version === resource.version &&
    installed.sha256 === resource.pack.sha256 &&
    deps.files.exists(finalPath)
  ) {
    return { status: 'installed' };
  }

  const partPath = svgMushafPartPath(key, resource.version);
  try {
    deps.files.ensureDirectory(svgMushafPackDirectory());
    deps.files.remove(partPath);
    return await downloadVerifyAndSwitch(deps, key, resource, { onProgress, signal }, partPath, finalPath);
  } catch {
    // An unexpected failure in the filesystem or the hash is reported as a storage failure, never thrown to the caller.
    return signal?.aborted ? { status: 'cancelled' } : { status: 'failed', reason: 'storage' };
  } finally {
    // Whatever the outcome, no .part survives this call.
    deps.files.remove(partPath);
  }
}

async function downloadVerifyAndSwitch(
  deps: SvgMushafInstallDeps,
  key: SvgMushafKey,
  resource: ContentManifestResource,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
  partPath: string,
  finalPath: string,
): Promise<SvgMushafInstallResult> {
  onProgress?.(0);
  try {
    await deps.api.downloadPack(packUrl(resource.pack.url), partPath, {
      signal,
      onProgress: onProgress === undefined ? undefined : (fraction) => onProgress(Math.min(DOWNLOAD_SHARE, fraction * DOWNLOAD_SHARE)),
    });
  } catch {
    return signal?.aborted ? { status: 'cancelled' } : { status: 'failed', reason: 'network' };
  }

  if (deps.files.size(partPath) !== resource.pack.size_bytes) {
    return { status: 'failed', reason: 'size' };
  }

  onProgress?.(VERIFYING_FRACTION);
  const hash = await deps.sha256File(partPath);
  if (signal?.aborted) {
    return { status: 'cancelled' };
  }
  if (hash !== resource.pack.sha256) {
    return { status: 'failed', reason: 'checksum' };
  }

  try {
    deps.files.remove(finalPath);
    deps.files.move(partPath, finalPath);
  } catch {
    return { status: 'failed', reason: 'storage' };
  }

  let hasWordBoxes: boolean;
  try {
    const reader = deps.openPack(finalPath);
    try {
      reader.verify({ key, resourceId: resource.id, version: resource.version });
      hasWordBoxes = reader.hasWordBoxes;
    } finally {
      reader.close();
    }
  } catch {
    deps.files.remove(finalPath);
    return { status: 'failed', reason: 'import' };
  }

  // The record moves first. Only then is the old file deleted, so a crash never leaves the record pointing at nothing.
  setInstalledSvgMushaf({
    key,
    resourceId: resource.id,
    version: resource.version,
    sha256: resource.pack.sha256,
    sizeBytes: resource.pack.size_bytes,
    hasWordBoxes,
    installedAt: deps.now(),
  });
  closeSvgMushafPack(key);
  removeOtherVersions(deps.files, key, finalPath);

  onProgress?.(1);
  return { status: 'installed' };
}

function removeOtherVersions(files: SvgMushafFiles, key: SvgMushafKey, keepPath: string): void {
  const keep = fileName(keepPath);
  const pattern = new RegExp(`^svg-mushaf-${key}-\\d+\\.db(-wal|-shm|-journal)?$`);
  let listed: string[] = [];
  try {
    listed = files.list(svgMushafPackDirectory());
  } catch (error) {
    logDev('The SVG mushaf directory could not be listed.', error);
    return;
  }
  for (const path of listed) {
    const name = fileName(path);
    if (name === keep || !pattern.test(name)) {
      continue;
    }
    try {
      files.remove(path);
    } catch (error) {
      logDev('An old SVG mushaf pack could not be deleted.', error);
    }
  }
}

export function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function logDev(message: string, error: unknown): void {
  if (__DEV__) {
    console.warn(message, error);
  }
}
