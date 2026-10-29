import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { getVerseRange } from '@/features/reader/data/verses';

import { usePlayerStore } from '../playerStore';

// The number of the ayah being recited, read from the content database, or null when no ayah is active.
// The player's engine sets the active verse id; the number is the verse's own number within its surah.
export function useActiveAyahNumber(): number | null {
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);

  return useMemo(() => {
    if (activeVerseId === null) {
      return null;
    }
    try {
      const verse = getVerseRange(openContentDb().executor, activeVerseId, activeVerseId)[0];
      return verse?.verseNumber ?? null;
    } catch {
      // The content database may not be open yet; the caption then shows the surah alone.
      return null;
    }
  }, [activeVerseId]);
}
