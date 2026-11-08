import { useContentDb } from '@/core/db/content/open';

import { useHadithAvailable, useHadithCatalog } from './hooks';

export type HadithHomeEntry = { tile: boolean; menuCard: boolean };

/**
 * Where Hadith is offered from. The Home tile and the Menu card both show once a pack is installed or the synced
 * catalogue lists a collection, so a new user can reach the list and download the first one (developer, 8 Nov 2026;
 * earlier the tile waited for an installed pack). Both are false until the content database is ready.
 */
export function useHadithHomeEntry(): HadithHomeEntry {
  const { ready } = useContentDb();
  const available = useHadithAvailable();
  const catalog = useHadithCatalog();
  if (!ready) {
    return { tile: false, menuCard: false };
  }
  const shown = available || catalog.length > 0;
  return { tile: shown, menuCard: shown };
}
