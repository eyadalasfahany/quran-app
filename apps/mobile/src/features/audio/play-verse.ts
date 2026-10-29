import { openContentDb } from '@/core/db/content/open';

import { listReciters, type CatalogReciter } from './data/reciters';
import { playFromVerse } from './player';
import { usePlayerStore } from './playerStore';
import { downloadReciterPack } from './reciter-downloads';
import { getReciterId, setReciterId } from './settings';
import { defaultReciterId, resolveReciterId } from './settings-model';

/**
 * The reciter a play from the reader uses: the saved choice, resolved against the catalogue (the same choice
 * the player makes). Null when the catalogue has no reciter, or the content database is not open yet.
 */
export function catalogueReciter(): CatalogReciter | null {
  let reciters: CatalogReciter[];
  try {
    reciters = listReciters(openContentDb().executor);
  } catch {
    return null;
  }
  const id = resolveReciterId(getReciterId(), reciters, defaultReciterId(reciters));
  return reciters.find((reciter) => reciter.resourceId === id) ?? null;
}

/**
 * Plays from an ayah with the catalogue's reciter. A pack that isn't installed is installed first, as the Listen
 * tab does; if that fails, nothing plays and the pack's row shows the failure there.
 */
export async function playVerse(verseKey: string): Promise<void> {
  const reciter = catalogueReciter();
  if (reciter === null) {
    usePlayerStore.getState().markFailed('no-reciter');
    return;
  }
  if (!reciter.installed && !(await downloadReciterPack(reciter.resourceId))) {
    return;
  }
  if (getReciterId() !== reciter.resourceId) {
    setReciterId(reciter.resourceId);
  }
  await playFromVerse(verseKey);
}
