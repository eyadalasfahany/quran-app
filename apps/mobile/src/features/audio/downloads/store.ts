import { create } from 'zustand';

type DownloadProgressState = {
  /** Live progress (0 to 1) of the transfer in flight, by audio file id. Written to `downloads.progress` too. */
  byId: Record<number, number>;
  set: (audioFileId: number, progress: number) => void;
  clear: (audioFileId: number) => void;
};

export const useDownloadProgress = create<DownloadProgressState>((set) => ({
  byId: {},
  set: (audioFileId, progress) => {
    set((state) => ({ byId: { ...state.byId, [audioFileId]: progress } }));
  },
  clear: (audioFileId) => {
    set((state) => {
      const next = { ...state.byId };
      delete next[audioFileId];
      return { byId: next };
    });
  },
}));
