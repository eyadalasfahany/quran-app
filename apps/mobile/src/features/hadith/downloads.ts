import { addNetworkStateListener, getNetworkStateAsync, NetworkStateType } from 'expo-network';
import { create } from 'zustand';

import { installResource } from '@/core/sync';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import type { CollectionDownloadState } from './components/CollectionDownloadButton';

export type HadithDownloadEntry = {
  /** 'waiting': Wi-Fi only is on and the device is not on Wi-Fi. Nothing runs; it resumes when Wi-Fi returns. */
  status: 'downloading' | 'failed' | 'waiting';
  progress: number; // 0 to 1
  /** 'wifi' on a waiting entry; 'network' on a failed one when the install could not reach the network. */
  reason?: 'wifi' | 'network';
};

type HadithDownloadsState = {
  byId: Record<number, HadithDownloadEntry>;
  start: (resourceId: number) => Promise<void>;
  cancel: (resourceId: number) => void;
};

// Controllers stay out of the store: they are not state, and the store should not re-render for them.
// A controller is also the busy marker, so a second tap before the Wi-Fi check ends does not start a second install.
const controllers = new Map<number, AbortController>();
let wifiWatch: { remove: () => void } | null = null;

function withoutEntry(byId: Record<number, HadithDownloadEntry>, id: number) {
  const next = { ...byId };
  delete next[id];
  return next;
}

/** Starts every waiting download again when the device reaches Wi-Fi. Each start re-checks the gate. */
function watchForWifi(): void {
  if (wifiWatch !== null) {
    return;
  }
  wifiWatch = addNetworkStateListener((state) => {
    if (state.isConnected !== true || state.type !== NetworkStateType.WIFI) {
      return;
    }
    for (const [id, entry] of Object.entries(useHadithDownloads.getState().byId)) {
      if (entry.status === 'waiting') {
        void useHadithDownloads.getState().start(Number(id));
      }
    }
  });
}

/** The store outlives the sheet and the list, so a download keeps its progress across remounts. */
export const useHadithDownloads = create<HadithDownloadsState>((set, get) => {
  const setEntry = (id: number, entry: HadithDownloadEntry) => {
    set((state) => ({ byId: { ...state.byId, [id]: entry } }));
  };
  const removeEntry = (id: number) => {
    controllers.delete(id);
    set((state) => ({ byId: withoutEntry(state.byId, id) }));
  };
  const fail = (id: number, reason?: 'network') => {
    controllers.delete(id);
    setEntry(id, reason === undefined ? { status: 'failed', progress: 0 } : { status: 'failed', progress: 0, reason });
  };
  const wait = (id: number) => {
    controllers.delete(id);
    setEntry(id, { status: 'waiting', progress: 0, reason: 'wifi' });
    watchForWifi();
  };

  return {
    byId: {},
    start: async (id) => {
      if (controllers.has(id)) {
        return;
      }
      const controller = new AbortController();
      controllers.set(id, controller);
      setEntry(id, { status: 'downloading', progress: 0 });

      if (getWifiOnlyDownloads()) {
        const network = await getNetworkStateAsync().catch(() => null);
        if (controller.signal.aborted) {
          removeEntry(id);
          return;
        }
        if (network === null || network.isConnected !== true || network.type !== NetworkStateType.WIFI) {
          wait(id);
          return;
        }
      }

      try {
        const result = await installResource(id, {
          onProgress: (fraction) => {
            setEntry(id, { status: 'downloading', progress: fraction });
          },
          signal: controller.signal,
        });
        if (result.status === 'installed' || result.status === 'cancelled') {
          removeEntry(id);
          return;
        }
        fail(id, result.reason === 'network' ? 'network' : undefined);
      } catch {
        fail(id);
      }
    },
    cancel: (id) => {
      if (get().byId[id]?.status === 'waiting') {
        removeEntry(id);
        return;
      }
      controllers.get(id)?.abort();
    },
  };
});

export function resetHadithDownloads(): void {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  controllers.clear();
  wifiWatch?.remove();
  wifiWatch = null;
  useHadithDownloads.setState({ byId: {} });
}

/** Maps a catalogue entry's install state and the store's entry to the row and sheet state. */
export function downloadStateFor(
  resourceId: number,
  installed: boolean,
  sizeBytes: number,
  offline: boolean,
  byId: Record<number, HadithDownloadEntry>,
): CollectionDownloadState {
  if (installed) {
    return { kind: 'installed' };
  }
  const entry = byId[resourceId];
  if (entry?.status === 'downloading') {
    return { kind: 'downloading', progress: entry.progress };
  }
  if (entry?.status === 'waiting') {
    return { kind: 'waiting' };
  }
  if (entry?.status === 'failed') {
    return { kind: 'failed' };
  }
  return { kind: 'available', sizeBytes, offline };
}
