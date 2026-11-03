import { router, type Href } from 'expo-router';

import { tabDestinations } from '@/core/layout';
import { resolveInitialAnchor } from '@/features/reader/anchor/reading-anchor';
import { useReaderSettings } from '@/features/reader/settings';

import type { DiscoverEntry } from './registry';
import { readDiscoverState, startTour } from './store';

/** The Discover screen, where the widget step opens its sheet. */
export const DISCOVER_HREF = '/discover' as Href;

/**
 * Opens the real feature for a tour step (ADR 0053, amended 3 Nov 2026). The step's tip shows on that screen while the
 * tour is on it. A reading step opens the reader at the saved place (the current ayah, as «تابع القراءة» does), switched
 * to its mode first so it opens in that mode; never the surah list.
 */
export function openDiscoverEntry(entry: DiscoverEntry): void {
  const { open } = entry;
  if (open.kind === 'widget-sheet') {
    router.navigate(DISCOVER_HREF);
    return;
  }
  if (open.kind === 'reader') {
    if (open.mode !== null) {
      useReaderSettings.getState().setMode(open.mode);
    }
    router.push(`/read/${resolveInitialAnchor().verseKey}` as Href);
    return;
  }
  if (open.kind === 'tab') {
    navigateToTab(open.name);
    return;
  }
  router.push(open.href);
}

/**
 * Closes the screens the tour opened for earlier steps, so each step opens on its own and back leaves the tour
 * instead of walking through every step (ADR 0053, amended 3 Nov 2026).
 */
export function unwindTourScreens(): void {
  if (router.canDismiss()) {
    router.dismissAll();
  }
}

/**
 * A row press: starts the tour at this row, or, when the tour is already on it (the person left its screen), opens
 * its screen again, since the stored step does not change and the tour navigator would not open it.
 */
export function startTourAt(entry: DiscoverEntry): void {
  if (readDiscoverState().tourStep === entry.id) {
    unwindTourScreens();
    openDiscoverEntry(entry);
    return;
  }
  startTour(entry.id);
}

function navigateToTab(name: string): void {
  const destination = tabDestinations.find((item) => item.name === name);
  if (destination === undefined) {
    throw new Error(`Unknown tab ${name}`);
  }
  router.navigate(destination.href);
}
