import { useCatalogVersion } from '@/core/sync';

import { useAudioSettings } from '../settings';
import { useReciterDownloads } from '../reciter-downloads';
import { catalogueReciter } from '../play-verse';

/**
 * Whether recitation can play from the reader: a reciter resolves from the catalogue. A pack that isn't installed
 * still counts, because playing installs it. Subscribes to installs and to the saved choice, so it re-reads both.
 */
export function useAudioAvailable(): boolean {
  useReciterDownloads((state) => state.installedVersion);
  useCatalogVersion((state) => state.version);
  useAudioSettings((state) => state.reciterId);
  return catalogueReciter() !== null;
}
