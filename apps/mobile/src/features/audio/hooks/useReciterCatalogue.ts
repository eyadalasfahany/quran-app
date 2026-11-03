import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync';

import { listReciters } from '../data/reciters';
import { usePlayerStore } from '../playerStore';
import { useAudioSettings } from '../settings';
import { defaultReciterId, resolveReciterId } from '../settings-model';
import { useReciterDownloads } from '../reciter-downloads';
import type { ReciterEntry } from '../reciter-list';

function readCatalogue(): ReciterEntry[] {
  let db;
  try {
    db = openContentDb().executor;
  } catch {
    // The Listen tab is mounted before the content database opens; an empty list, not a crash.
    return [];
  }
  return listReciters(db).map((reciter) => ({
    hasTimings: reciter.hasTimings,
    installed: reciter.installed,
    isDefault: reciter.isDefault,
    name: reciter.name,
    nameAr: reciter.nameAr,
    resourceId: reciter.resourceId,
    style: reciter.style,
  }));
}

/** Every catalogue reciter, the chosen one (the saved choice, resolved) and the one playing now. */
export function useReciterCatalogue(ready: boolean): {
  reciters: ReciterEntry[];
  selectedId: number | null;
  playingId: number | null;
} {
  // Subscribing to installedVersion and the catalogue version re-renders after an install or a catalogue sync,
  // which reads the catalogue again (on first launch the sync lands after this tab mounted).
  useReciterDownloads((state) => state.installedVersion);
  useCatalogVersion((state) => state.version);
  const savedId = useAudioSettings((state) => state.reciterId);
  const playingId = usePlayerStore((state) => (state.status === 'playing' ? state.reciterId : null));

  const reciters = ready ? readCatalogue() : [];
  const selectedId = resolveReciterId(savedId, reciters, defaultReciterId(reciters));

  return { reciters, selectedId, playingId };
}
