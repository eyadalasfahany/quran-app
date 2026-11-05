import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { useCatalogVersion } from '@/core/sync';

import {
  availabilityForReciters,
  availableChapterIds,
  surahAvailability,
  type SurahAvailability,
} from '../data/surah-availability';
import { useReciterDownloads } from '../reciter-downloads';

// The content database may not be open yet (the lists mount before it opens). A missing database means no answer,
// not a crash, so each hook returns its "don't know" value.
function readExecutor(): SqlExecutor | null {
  try {
    return openContentDb().executor;
  } catch {
    return null;
  }
}

/** The surah's availability for one reciter; re-read when a pack installs or the catalogue syncs. */
export function useSurahAvailability(resourceId: number | null, chapterId: number | null): SurahAvailability {
  const installedVersion = useReciterDownloads((state) => state.installedVersion);
  const catalogVersion = useCatalogVersion((state) => state.version);

  return useMemo(() => {
    if (resourceId === null || chapterId === null) {
      return 'unknown';
    }
    const executor = readExecutor();
    return executor === null ? 'unknown' : surahAvailability(executor, resourceId, chapterId);
    // installedVersion and catalogVersion are not read here: they only re-run the lookup after an install or a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, chapterId, installedVersion, catalogVersion]);
}

/** A reciter's available surah set (null = unknown); for lists of many surahs. */
export function useAvailableChapterIds(resourceId: number | null): Set<number> | null {
  const installedVersion = useReciterDownloads((state) => state.installedVersion);
  const catalogVersion = useCatalogVersion((state) => state.version);

  return useMemo(() => {
    if (resourceId === null) {
      return null;
    }
    const executor = readExecutor();
    return executor === null ? null : availableChapterIds(executor, resourceId);
    // installedVersion and catalogVersion are not read here: they only re-run the lookup after an install or a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, installedVersion, catalogVersion]);
}

/** For the player's reciter list: resourceId -> availability of one surah. */
export function useReciterAvailabilityForSurah(
  resourceIds: readonly number[],
  chapterId: number | null,
): Record<number, SurahAvailability> {
  const installedVersion = useReciterDownloads((state) => state.installedVersion);
  const catalogVersion = useCatalogVersion((state) => state.version);
  // Callers often pass a new array each render; the joined key keeps the memo stable for the same ids.
  const idsKey = resourceIds.join(',');

  return useMemo(() => {
    const ids = idsKey === '' ? [] : idsKey.split(',').map(Number);
    const unknown = Object.fromEntries(ids.map((id) => [id, 'unknown' as const]));
    if (chapterId === null) {
      return unknown;
    }
    const executor = readExecutor();
    return executor === null ? unknown : availabilityForReciters(executor, ids, chapterId);
    // installedVersion and catalogVersion are not read here: they only re-run the lookup after an install or a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, chapterId, installedVersion, catalogVersion]);
}
