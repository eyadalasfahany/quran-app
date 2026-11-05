import { create } from 'zustand';

import { installResource } from '@/core/sync';

export type ReciterDownloadEntry = { status: 'downloading' | 'failed'; progress: number };

type ReciterDownloadsState = {
  byId: Record<number, ReciterDownloadEntry>;
  /** Bumped on each install, so the catalogue is read again. */
  installedVersion: number;
};

export const useReciterDownloads = create<ReciterDownloadsState>(() => ({ byId: {}, installedVersion: 0 }));

// A second call while the pack is installing shares the running install.
const inFlight = new Map<number, Promise<boolean>>();
// One controller per running install, so the player's stop button can cancel it.
const controllers = new Map<number, AbortController>();
// The token of the install that owns each row entry. Only that install may change or clear the entry, so a
// cancelled install that settles late cannot clear the entry of a newer install of the same reciter.
const owners = new Map<number, object>();

function setEntry(id: number, entry: ReciterDownloadEntry | null): void {
  useReciterDownloads.setState((state) => {
    const byId = { ...state.byId };
    if (entry === null) {
      delete byId[id];
    } else {
      byId[id] = entry;
    }
    return { byId };
  });
}

/** Installs a reciter's pack (URLs and timings only). Resolves true once it is installed. */
export function downloadReciterPack(resourceId: number): Promise<boolean> {
  const running = inFlight.get(resourceId);
  if (running !== undefined) {
    return running;
  }
  const token = {};
  owners.set(resourceId, token);
  setEntry(resourceId, { status: 'downloading', progress: 0 });
  const controller = new AbortController();
  controllers.set(resourceId, controller);
  const isOwner = () => owners.get(resourceId) === token;
  const setOwnedEntry = (entry: ReciterDownloadEntry | null) => {
    if (isOwner()) {
      setEntry(resourceId, entry);
    }
  };
  const promise = installResource(resourceId, {
    onProgress: (fraction) => {
      setOwnedEntry({ status: 'downloading', progress: fraction });
    },
    signal: controller.signal,
  })
    .then((result) => {
      if (result.status === 'installed') {
        setOwnedEntry(null);
        useReciterDownloads.setState((state) => ({ installedVersion: state.installedVersion + 1 }));
        return true;
      }
      // A cancelled install leaves no entry; a failed one keeps a failed entry for the row.
      setOwnedEntry(result.status === 'cancelled' ? null : { status: 'failed', progress: 0 });
      return false;
    })
    .catch(() => {
      setOwnedEntry({ status: 'failed', progress: 0 });
      return false;
    })
    .finally(() => {
      if (isOwner()) {
        owners.delete(resourceId);
      }
      if (inFlight.get(resourceId) === promise) {
        inFlight.delete(resourceId);
      }
      if (controllers.get(resourceId) === controller) {
        controllers.delete(resourceId);
      }
    });
  inFlight.set(resourceId, promise);
  return promise;
}

/**
 * Stops a running pack install. Its row entry is cleared at once and the install ends as cancelled. A second cancel,
 * or a reciter with no running install, does nothing. A new download started after this one is not affected by
 * the cancelled install settling later.
 */
export function cancelReciterPack(resourceId: number): void {
  const controller = controllers.get(resourceId);
  if (controller === undefined) {
    return;
  }
  controllers.delete(resourceId);
  owners.delete(resourceId);
  inFlight.delete(resourceId);
  setEntry(resourceId, null);
  controller.abort();
}

export function resetReciterDownloads(): void {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  controllers.clear();
  owners.clear();
  inFlight.clear();
  useReciterDownloads.setState({ byId: {}, installedVersion: 0 });
}
