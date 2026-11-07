import { useContentDb } from '@/core/db/content/open';

import { useHadithAvailable, useHadithCatalog } from './hooks';

export type HadithHomeEntry = { tile: boolean; menuCard: boolean };

/**
 * Where Hadith is offered from. The Home tile needs one installed pack. The Menu card also shows when the synced
 * catalogue lists a collection, so a new user can reach the list and download the first one (Open question 1).
 * Both are false until the content database is ready.
 */
export function useHadithHomeEntry(): HadithHomeEntry {
  const { ready } = useContentDb();
  const available = useHadithAvailable();
  const catalog = useHadithCatalog();
  if (!ready) {
    return { tile: false, menuCard: false };
  }
  const tile = available;
  return { tile, menuCard: tile || catalog.length > 0 };
}
