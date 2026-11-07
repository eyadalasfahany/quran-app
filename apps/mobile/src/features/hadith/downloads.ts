import { getNetworkStateAsync, NetworkStateType } from 'expo-network';
import { create } from 'zustand';

import { installResource } from '@/core/sync';
import { getWifiOnlyDownloads } from '@/features/audio/settings';

import type { CollectionDownloadState } from './components/CollectionDownloadButton';

export type HadithDownloadEntry = {
  status: 'downloading' | 'failed';
  progress: number; // 0 to 1
  /** 'wifi': Wi-Fi only is on and the device is not on Wi-Fi, nothing was started. 'network': the install could not reach the network. */
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

function withoutEntry(byId: Record<number, HadithDownloadEntry>, id: number) {
  const next = { ...byId };
  delete next[id];
  return next;
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
  const fail = (id: number, reason?: 'wifi' | 'network') => {
    controllers.delete(id);
    setEntry(id, reason === undefined ? { status: 'failed', progress: 0 } : { status: 'failed', progress: 0, reason });
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
          fail(id, 'wifi');
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
      controllers.get(id)?.abort();
    },
  };
});

export function resetHadithDownloads(): void {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  controllers.clear();
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
  if (entry?.status === 'failed') {
    return { kind: 'failed' };
  }
  return { kind: 'available', sizeBytes, offline };
}
