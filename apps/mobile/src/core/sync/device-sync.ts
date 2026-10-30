import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { gunzipSync } from 'fflate';

import { openContentDb } from '@/core/db/content/open';
import { removeReciter } from '@/features/audio/downloads/manager';

import { getChanges, getManifest } from '../api/content';
import { syncContent, type ContentSyncDeps, type ContentSyncReport, type FileStore, type PackDownloadOptions } from './content-sync';
import { installResourceWith, type InstallOptions, type InstallResult } from './install-resource';
import { selectedResourceIds } from './selection';

export function expoFileStore(): FileStore {
  return {
    get cacheDir() {
      return Paths.cache.uri.replace(/\/+$/, '');
    },
    async readBytes(path) {
      return new Uint8Array(await new File(path).bytes());
    },
    async writeBytes(path, bytes) {
      const file = new File(path);
      ensureParent(file.parentDirectory);
      if (file.exists) {
        file.delete();
      }
      await file.write(bytes);
    },
    async remove(path) {
      const file = new File(path);
      if (file.exists) {
        file.delete();
      }
    },
  };
}

export async function downloadPack(url: string, toPath: string, options: PackDownloadOptions = {}): Promise<void> {
  const destination = new File(toPath);
  ensureParent(destination.parentDirectory);
  const { onProgress, signal } = options;
  await File.downloadFileAsync(url, destination, {
    idempotent: true,
    signal,
    onProgress:
      onProgress === undefined
        ? undefined
        : ({ bytesWritten, totalBytes }) => onProgress(totalBytes > 0 ? bytesWritten / totalBytes : 0),
  });
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const data = new Uint8Array(buffer);
  data.set(bytes);
  const hashed = await digest(CryptoDigestAlgorithm.SHA256, data);
  const view = new Uint8Array(hashed);
  let hex = '';
  for (const byte of view) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function gunzipPack(bytes: Uint8Array): Uint8Array {
  return gunzipSync(bytes);
}

function deviceContentDeps(): ContentSyncDeps {
  const { executor } = openContentDb();
  return {
    db: executor,
    api: { getManifest, getChanges, downloadPack },
    files: expoFileStore(),
    sha256: sha256Bytes,
    gunzip: gunzipPack,
    now: () => Date.now(),
    selection: selectedResourceIds,
    onResourceRemoved: (resourceId, group) => {
      if (group !== 'chapter_recitations') {
        return;
      }
      // The pack is gone, so its downloads go with it. A failure here must not fail the sync.
      try {
        removeReciter(resourceId);
      } catch (error) {
        console.warn('Downloaded audio was not removed with its reciter.', error);
      }
    },
  };
}

export async function runDeviceContentSync(): Promise<ContentSyncReport> {
  return syncContent(deviceContentDeps());
}

/** Installs one catalogue resource on demand. Concurrent calls for the same id share one promise. */
export function installResource(resourceId: number, options: InstallOptions = {}): Promise<InstallResult> {
  return installResourceWith(deviceContentDeps(), resourceId, options);
}

function ensureParent(directory: Directory): void {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}
