import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';

import { usePlayerStore } from '../playerStore';
import { useIdleReciter } from './useIdleReciter';

/**
 * The surah the reader bar says is unavailable for the reciter, or null (ADR 0062). The notice holds only while a
 * play would still use the same reciter and the current ayah is still in the same surah. Choosing another reciter or
 * reading another surah therefore returns the bar to its idle form, with nothing to reset. A new play clears it.
 */
export function useMiniUnavailable(): { chapterId: number; reciterId: number } | null {
  const unavailable = usePlayerStore((state) => state.unavailable);
  const status = usePlayerStore((state) => state.status);
  const error = usePlayerStore((state) => state.error);
  const active = status === 'error' && error === 'surah-unavailable' && unavailable !== null;
  const idleReciter = useIdleReciter(active);
  const current = useLastReadVerseKey();

  if (!active || unavailable === null) {
    return null;
  }
  if (idleReciter?.resourceId !== unavailable.reciterId) {
    return null;
  }
  const currentChapterId = Number(current.split(':')[0]);
  return currentChapterId === unavailable.chapterId ? unavailable : null;
}
