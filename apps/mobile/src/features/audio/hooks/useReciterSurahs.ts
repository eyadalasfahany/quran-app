import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';

import { reciterSurahs, type ReciterSurahs } from '../data/reciter-surahs';

const EMPTY: ReciterSurahs = { surahs: [], total: 0 };

/**
 * A reciter's surah list for the download page, read from the content database. Read again when the pack is
 * installed (`installed` changes), so the list appears without a restart.
 */
export function useReciterSurahs(resourceId: number, ready: boolean, installed: boolean): ReciterSurahs {
  return useMemo(() => {
    if (!ready) {
      return EMPTY;
    }
    try {
      const result = reciterSurahs(openContentDb().executor, resourceId);
      // The surah list is the pack's: nothing lists before it is installed, though the total still counts.
      return installed ? result : { surahs: [], total: result.total };
    } catch {
      // The content database is not open yet: an empty list, not a crash.
      return EMPTY;
    }
  }, [ready, installed, resourceId]);
}
