import { useContentDb } from '@/core/db/content/open';

import { useSeerahAvailable, useSeerahCatalogEntry } from './hooks';

/**
 * Whether the Menu offers Seerah: once the pack is installed or the synced catalogue lists it, so a new reader can reach the
 * screen and download it (as Hadith, ADR 0042). False until content.db is ready.
 */
export function useSeerahMenuCard(): boolean {
  const { ready } = useContentDb();
  const available = useSeerahAvailable();
  const catalog = useSeerahCatalogEntry();
  return ready && (available || catalog !== undefined);
}
