import { storage, storageKeys } from '@/core/storage/mmkv';

import type { SeerahView } from './components/ListToggle';

/** The view the reader last chose, or null when they never did. */
export function readSeerahView(): SeerahView | null {
  const value = storage.getString(storageKeys.seerah.view);
  return value === 'list' || value === 'map' ? value : null;
}

export function writeSeerahView(view: SeerahView): void {
  storage.set(storageKeys.seerah.view, view);
}

/**
 * The view to open with: a route parameter wins, then the reader's own choice, then (only with a screen reader on) the
 * list as a suggestion. The suggestion is never stored and never overrides a choice.
 */
export function initialSeerahView(input: { param: SeerahView | null; stored: SeerahView | null; screenReader: boolean }): SeerahView {
  return input.param ?? input.stored ?? (input.screenReader ? 'list' : 'map');
}
