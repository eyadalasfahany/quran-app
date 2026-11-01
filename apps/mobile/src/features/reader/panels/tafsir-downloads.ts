import { create } from 'zustand';

import { installResource } from '@/core/sync';

export type TafsirDownloadEntry = {
  status: 'downloading' | 'failed';
  progress: number;
  /** A failed install that could not reach the network. The row says so and offers the download again. */
  reason?: 'network';
};

type TafsirDownloadsState = {
  byId: Record<number, TafsirDownloadEntry>;
  // Bumped on each install, so panels re-read the catalogue.
  installedVersion: number;
  start: (id: number) => void;
  cancel: (id: number) => void;
};

// Controllers stay out of the store: they are not state, and the store should not re-render for them.
const controllers = new Map<number, AbortController>();

function withoutEntry(byId: Record<number, TafsirDownloadEntry>, id: number) {
  const next = { ...byId };
  delete next[id];
  return next;
}

// The store outlives the sheet and the panel, so a download keeps its progress across remounts.
export const useTafsirDownloads = create<TafsirDownloadsState>((set, get) => {
  const setEntry = (id: number, entry: TafsirDownloadEntry) => {
    set((state) => ({ byId: { ...state.byId, [id]: entry } }));
  };

  return {
    byId: {},
    installedVersion: 0,
    start: (id) => {
      if (get().byId[id]?.status === 'downloading') {
        return;
      }
      const controller = new AbortController();
      controllers.set(id, controller);
      setEntry(id, { status: 'downloading', progress: 0 });

      const finish = (update: () => void) => {
        controllers.delete(id);
        update();
      };

      installResource(id, {
        onProgress: (fraction) => {
          setEntry(id, { status: 'downloading', progress: fraction });
        },
        signal: controller.signal,
      }).then(
        (result) => {
          if (result.status === 'installed') {
            finish(() => {
              set((state) => ({ byId: withoutEntry(state.byId, id), installedVersion: state.installedVersion + 1 }));
            });
            return;
          }
          if (result.status === 'cancelled') {
            finish(() => {
              set((state) => ({ byId: withoutEntry(state.byId, id) }));
            });
            return;
          }
          finish(() => {
            setEntry(id, result.reason === 'network' ? { progress: 0, reason: 'network', status: 'failed' } : { progress: 0, status: 'failed' });
          });
        },
        () => {
          finish(() => {
            setEntry(id, { status: 'failed', progress: 0 });
          });
        },
      );
    },
    cancel: (id) => {
      controllers.get(id)?.abort();
    },
  };
});

export function resetTafsirDownloads(): void {
  for (const controller of controllers.values()) {
    controller.abort();
  }
  controllers.clear();
  useTafsirDownloads.setState({ byId: {}, installedVersion: 0 });
}
