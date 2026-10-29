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
  setEntry(resourceId, { status: 'downloading', progress: 0 });
  const promise = installResource(resourceId, {
    onProgress: (fraction) => {
      setEntry(resourceId, { status: 'downloading', progress: fraction });
    },
  })
    .then((result) => {
      if (result.status === 'installed') {
        setEntry(resourceId, null);
        useReciterDownloads.setState((state) => ({ installedVersion: state.installedVersion + 1 }));
        return true;
      }
      // A cancelled install leaves no entry; a failed one keeps a failed entry for the row.
      setEntry(resourceId, result.status === 'cancelled' ? null : { status: 'failed', progress: 0 });
      return false;
    })
    .catch(() => {
      setEntry(resourceId, { status: 'failed', progress: 0 });
      return false;
    })
    .finally(() => {
      inFlight.delete(resourceId);
    });
  inFlight.set(resourceId, promise);
  return promise;
}

export function resetReciterDownloads(): void {
  inFlight.clear();
  useReciterDownloads.setState({ byId: {}, installedVersion: 0 });
}
