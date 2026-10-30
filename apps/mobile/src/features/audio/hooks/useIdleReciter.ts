import { useCatalogVersion } from '@/core/sync';

import type { CatalogReciter } from '../data/reciters';
import { catalogueReciter } from '../play-verse';
import { useReciterDownloads } from '../reciter-downloads';
import { useAudioSettings } from '../settings';

// The reciter a play from the reader would use, read only when `enabled` (the idle bar). It re-reads the saved
// choice and installs, as useAudioAvailable does, so the bar follows them. Null when no reciter resolves.
export function useIdleReciter(enabled: boolean): CatalogReciter | null {
  useAudioSettings((state) => state.reciterId);
  useReciterDownloads((state) => state.installedVersion);
  useCatalogVersion((state) => state.version);
  return enabled ? catalogueReciter() : null;
}
