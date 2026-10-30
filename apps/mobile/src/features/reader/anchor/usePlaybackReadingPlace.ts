import { useEffect } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { usePlayerStore } from '@/features/audio/playerStore';

import { idToVerseKey } from '../data/verses';

import { pageForVerse } from './page';
import { writePlayedPlace } from './reading-anchor';

/** While an ayah is playing, the continue-reading place follows it, even when the reader is showing another surah. */
export function usePlaybackReadingPlace(ready: boolean): void {
  const status = usePlayerStore((state) => state.status);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);

  useEffect(() => {
    if (!ready || (status !== 'playing' && status !== 'loading') || activeVerseId === null) {
      return;
    }
    try {
      const executor = openContentDb().executor;
      const verseKey = idToVerseKey(executor, activeVerseId);
      if (verseKey === undefined) {
        return;
      }
      writePlayedPlace(verseKey, pageForVerse(executor, verseKey) ?? null);
    } catch {
      // The content database is not open yet. The reader writes the same place once it is.
    }
  }, [activeVerseId, ready, status]);
}
