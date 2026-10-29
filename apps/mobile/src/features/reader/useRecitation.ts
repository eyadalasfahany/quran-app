import { useMemo } from 'react';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { usePlayerStore, type PlayerStatus } from '@/features/audio/playerStore';

import { idToVerseKey } from './data/verses';

export type Recitation = {
  status: PlayerStatus;
  /** The ayah being recited (the player's activeVerseId as a verse key), null when none. */
  recitedVerseKey: string | null;
  /** The word being recited, 1-based, when the ayah has word segments. */
  activeWord: number | null;
};

/** The player's recited ayah and word, read as verse keys for the reader's lists. */
export function useRecitation(executor: SqlExecutor | null): Recitation {
  const status = usePlayerStore((state) => state.status);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const activeWord = usePlayerStore((state) => state.activeWord);
  const recitedVerseKey = useMemo(
    () => (executor === null || activeVerseId === null ? null : (idToVerseKey(executor, activeVerseId) ?? null)),
    [activeVerseId, executor],
  );
  return { activeWord, recitedVerseKey, status };
}
