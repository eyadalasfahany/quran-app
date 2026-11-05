import type { SurahAvailability } from './data/surah-availability';
import type { ReciterEntry } from './reciter-list';
import type { PlayerReciterRowState } from './components/PlayerReciterRow';

/** The current reciter first, then the rest in catalogue order (resource id, as the catalogue reads them). */
export function currentReciterFirst(reciters: readonly ReciterEntry[], currentId: number | null): ReciterEntry[] {
  const current = reciters.find((reciter) => reciter.resourceId === currentId);
  if (current === undefined) {
    return [...reciters];
  }
  return [current, ...reciters.filter((reciter) => reciter !== current)];
}

/**
 * A row's state (ADR 0062, step 7). The current reciter always reads as current. An installed pack with no file for
 * the surah is unavailable; an uninstalled pack never is, because its surahs are not known yet. Then a running
 * download, then not downloaded, then installed.
 */
export function playerReciterRowState({
  isCurrent,
  installed,
  availability,
  downloading,
}: {
  isCurrent: boolean;
  installed: boolean;
  availability: SurahAvailability;
  downloading: boolean;
}): PlayerReciterRowState {
  if (isCurrent) {
    return 'current';
  }
  if (installed && availability === 'unavailable') {
    return 'unavailable';
  }
  if (downloading) {
    return 'downloading';
  }
  return installed ? 'installed' : 'notDownloaded';
}
