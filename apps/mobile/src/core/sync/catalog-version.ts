import { create } from 'zustand';

type CatalogVersionState = { version: number };

// Bumped after every catalogue write, so screens that read `catalog_resources` once per render (the Listen tab,
// the mini player's names) re-read it when a first-launch sync lands after they mounted.
export const useCatalogVersion = create<CatalogVersionState>(() => ({ version: 0 }));

export function bumpCatalogVersion(): void {
  useCatalogVersion.setState((state) => ({ version: state.version + 1 }));
}
