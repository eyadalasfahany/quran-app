import { create } from 'zustand';

type CatalogVersionState = {
  version: number;
  // True once a content sync run has finished, whether it succeeded or failed. Until then an empty catalogue
  // means «still loading», not «no reciters».
  syncSettled: boolean;
  // The time (ms) of the last bump or settle, so a reader can take a clock that moves with the sync. Null until one happens.
  changedAt: number | null;
};

// Bumped after every catalogue write, so screens that read `catalog_resources` once per render (the Listen tab,
// the mini player's names) re-read it when a first-launch sync lands after they mounted.
export const useCatalogVersion = create<CatalogVersionState>(() => ({ syncSettled: false, version: 0, changedAt: null }));

export function bumpCatalogVersion(): void {
  useCatalogVersion.setState((state) => ({ version: state.version + 1, changedAt: Date.now() }));
}

export function markSyncSettled(): void {
  useCatalogVersion.setState({ syncSettled: true, changedAt: Date.now() });
}
