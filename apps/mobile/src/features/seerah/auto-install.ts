import { openContentDb } from '@/core/db/content/open';
import { runDeviceContentSync } from '@/core/sync';
import { type HadithDownloadEntry, useHadithDownloads } from '@/features/hadith/downloads';

import { getSeerahCatalogEntry, type SeerahCatalogEntry } from './data';

/**
 * Whether to start the Seerah install (ADR 0097): only when the synced catalogue lists the pack, it is not installed, and
 * no install of it is running or waiting. A failed install (or none) starts again.
 */
export function seerahAutoInstallAction(
  entry: SeerahCatalogEntry | undefined,
  running: HadithDownloadEntry | undefined,
): 'start' | 'none' {
  if (entry === undefined || entry.installed) {
    return 'none';
  }
  return running?.status === 'downloading' || running?.status === 'waiting' ? 'none' : 'start';
}

/**
 * Starts the on-demand Seerah install with no user choice, over any network. Called after a content sync run settles and
 * when the Seerah screen opens, never on a catalogue bump (an install bumps it, so a failing pack would loop). It never
 * throws and never awaits the install, so nothing waits on the network.
 */
export function autoInstallSeerah(): void {
  try {
    const entry = getSeerahCatalogEntry(openContentDb().executor);
    const store = useHadithDownloads.getState();
    if (entry !== undefined && seerahAutoInstallAction(entry, store.byId[entry.resourceId]) === 'start') {
      void store.start(entry.resourceId, { anyNetwork: true });
    }
  } catch {
    // content.db not open yet, or the catalogue table missing: the next settle or screen open tries again.
  }
}

/** The content sync run the root layout schedules: the sync, then the Seerah trigger, keeping the sync's outcome. */
export function runContentSyncThenSeerah(): Promise<unknown> {
  return runDeviceContentSync().finally(autoInstallSeerah);
}
