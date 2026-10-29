import { openContentDb } from '@/core/db/content/open';

import { listReciters, recitationStyle } from '../data/reciters';
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
    installed: reciter.installed,
    isDefault: reciter.isDefault,
    name: reciter.name,
    nameAr: reciter.nameAr,
    resourceId: reciter.resourceId,
    style: recitationStyle(db, reciter.resourceId),
  }));
}

/** Every catalogue reciter, the chosen one (the saved choice, resolved) and the one playing now. */
export function useReciterCatalogue(ready: boolean): {
  reciters: ReciterEntry[];
  selectedId: number | null;
  playingId: number | null;
} {
  // Subscribing to installedVersion re-renders after an install, which reads the catalogue again.
  useReciterDownloads((state) => state.installedVersion);
  const savedId = useAudioSettings((state) => state.reciterId);
  const playingId = usePlayerStore((state) => (state.status === 'playing' ? state.reciterId : null));

  const reciters = ready ? readCatalogue() : [];
  const selectedId = resolveReciterId(savedId, reciters, defaultReciterId(reciters));

  return { reciters, selectedId, playingId };
}
