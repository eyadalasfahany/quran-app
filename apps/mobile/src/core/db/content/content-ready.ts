import { create } from 'zustand';

/** Whether `content.db` is migrated and seeded, and the error that stopped it. Written once by the root layout. */
export type ContentReadyState = { ready: boolean; error: Error | null };

/**
 * The shared readiness of `content.db`. The root layout runs the migrations and the seed import once (see
 * `useContentDbBootstrap` in `open.ts`) and publishes the result here; every other `useContentDb()` reads it, so no
 * component runs the migrations again.
 */
export const useContentReady = create<ContentReadyState>(() => ({ ready: false, error: null }));

export function publishContentReady(state: ContentReadyState): void {
  useContentReady.setState(state);
}
