import { create } from 'zustand';

import type { SvgMushafInstallFailure, SvgMushafKey } from './types';

export type SvgMushafTransientPhase = 'idle' | 'downloading' | 'verifying' | 'waiting_wifi' | 'failed' | 'cancelled';

export type SvgMushafTransient = {
  phase: SvgMushafTransientPhase;
  progress: number;
  error: SvgMushafInstallFailure | null;
};

export const IDLE_SVG_MUSHAF_TRANSIENT: SvgMushafTransient = { phase: 'idle', progress: 0, error: null };

type SvgMushafPackState = {
  byKey: Partial<Record<SvgMushafKey, SvgMushafTransient>>;
  /** Bumped when an install or removal changes the installed records, so the hook re-reads them. */
  revision: number;
  patch: (key: SvgMushafKey, patch: Partial<SvgMushafTransient>) => void;
  bumpRevision: () => void;
};

/** Per-riwayah transient state, shared by every screen that shows the same download. */
export const useSvgMushafPackStore = create<SvgMushafPackState>((set) => ({
  byKey: {},
  revision: 0,
  patch: (key, patch) =>
    set((state) => ({ byKey: { ...state.byKey, [key]: { ...(state.byKey[key] ?? IDLE_SVG_MUSHAF_TRANSIENT), ...patch } } })),
  bumpRevision: () => set((state) => ({ revision: state.revision + 1 })),
}));

const controllers = new Map<SvgMushafKey, AbortController>();

export function startSvgMushafController(key: SvgMushafKey): AbortController {
  const controller = new AbortController();
  controllers.set(key, controller);
  return controller;
}

export function finishSvgMushafController(key: SvgMushafKey): void {
  controllers.delete(key);
}

export function abortSvgMushafController(key: SvgMushafKey): void {
  controllers.get(key)?.abort();
}
