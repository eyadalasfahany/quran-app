import type { ContentManifestResource } from '@quran/api-contract';

import { useReaderSettings } from '@/features/reader/settings';

import type { ContentSyncDeps } from './content-sync';
import { PackDownloadError, importPack, writeCatalog } from './content-sync';
import { contentGroup } from './content-tables';
import { installedTafsirIds, keepOnDemand } from './on-demand';

export type InstallOptions = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export type InstallFailureReason = 'checksum' | 'network' | 'import' | 'unavailable';

export type InstallResult = { status: 'installed' } | { status: 'cancelled' } | { status: 'failed'; reason: InstallFailureReason };

export type InstallDeps = Omit<ContentSyncDeps, 'selection'>;

// Share the running install for each resource. A second caller gets the same promise.
const inFlight = new Map<number, Promise<InstallResult>>();

// Download is 0..0.9 of the progress bar; import takes the rest and reports 1 when done.
const DOWNLOAD_SHARE = 0.9;

export function installResourceWith(
  deps: InstallDeps,
  resourceId: number,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const running = inFlight.get(resourceId);
  if (running !== undefined) {
    return running;
  }
  const promise = runInstall(deps, resourceId, options).finally(() => {
    inFlight.delete(resourceId);
  });
  inFlight.set(resourceId, promise);
  return promise;
}

async function runInstall(deps: InstallDeps, resourceId: number, options: InstallOptions): Promise<InstallResult> {
  const { onProgress, signal } = options;
  if (signal?.aborted) {
    return { status: 'cancelled' };
  }

  let resource: ContentManifestResource | undefined;
  try {
    // No ETag: a 304 has no body, and the pack url and checksum come from the manifest.
    // The cancel reaches the manifest request, so a cancelled tafsir install stops waiting on the network.
    const manifest = await deps.api.getManifest(undefined, signal);
    if (manifest.status !== 200) {
      return { status: 'failed', reason: 'network' };
    }
    writeCatalog(deps.db, manifest.manifest.resources);
    resource = manifest.manifest.resources.find((item) => item.id === resourceId);
  } catch {
    return signal?.aborted ? { status: 'cancelled' } : { status: 'failed', reason: 'network' };
  }

  if (resource === undefined || contentGroup(resource.group) === undefined) {
    return { status: 'failed', reason: 'unavailable' };
  }

  onProgress?.(0);
  let outcome: 'pack-imported' | 'skipped';
  try {
    outcome = await importPack(deps, resource, deps.now(), {
      signal,
      onProgress:
        onProgress === undefined ? undefined : (fraction) => onProgress(Math.min(DOWNLOAD_SHARE, fraction * DOWNLOAD_SHARE)),
    });
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'cancelled' };
    }
    return { status: 'failed', reason: error instanceof PackDownloadError ? 'network' : 'import' };
  }

  if (outcome === 'skipped') {
    return { status: 'failed', reason: 'checksum' };
  }

  if (resource.group === 'tafsirs') {
    keepOnDemand(deps.db, [resource.id]);
    // The first tafsir the reader downloads becomes their choice. The panel does not navigate.
    const settings = useReaderSettings.getState();
    if (!settings.tafsirChosen) {
      keepOnDemand(deps.db, installedTafsirIds(deps.db));
      settings.setTafsirId(resource.id);
    }
  }

  onProgress?.(1);
  return { status: 'installed' };
}
