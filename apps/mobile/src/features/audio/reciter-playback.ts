import { resolveInitialAnchor } from '../reader/anchor/reading-anchor';
import { playChapter, playFromVerse, resume } from './player';
import { usePlayerStore } from './playerStore';
import { setReciterId } from './settings';
import { downloadReciterPack } from './reciter-downloads';

/**
 * Plays a reciter from the current ayah (ADR 0046): `reader.lastVerseKey`, the one ayah the app has. A pack that
 * isn't installed is installed first; if that fails, nothing changes. A reciter already playing or loading is kept
 * as it is. Otherwise the reciter starts the current ayah from its start, even when that ayah is the paused one.
 */
export async function playReciter(resourceId: number, installed: boolean): Promise<void> {
  const store = usePlayerStore.getState();
  store.beginStarting({ kind: 'reciter', resourceId });
  const current = usePlayerStore.getState();
  if (current.reciterId === resourceId && (current.status === 'playing' || current.status === 'loading')) {
    current.clearStarting();
    return;
  }
  if (!installed && !(await downloadReciterPack(resourceId))) {
    store.clearStarting();
    return;
  }
  setReciterId(resourceId);
  await playFromVerse(resolveInitialAnchor().verseKey);
}

/**
 * Plays a recent listen: its reciter, from the saved position of its surah (Home's «آخر ما استمعت إليه»). An
 * uninstalled pack is installed first; if that fails, nothing changes.
 */
export async function playRecentListen(
  listen: { reciterResourceId: number; chapterId: number; lastPositionMs: number },
  installed: boolean,
): Promise<void> {
  const store = usePlayerStore.getState();
  store.beginStarting({ kind: 'listen', resourceId: listen.reciterResourceId, chapterId: listen.chapterId });
  // The surah already loaded with this reciter is not restarted at the saved position, which can be up to
  // 15 s behind: playing stays as it is, and paused resumes where it stopped.
  const current = usePlayerStore.getState();
  if (current.reciterId === listen.reciterResourceId && current.chapterId === listen.chapterId) {
    if (current.status === 'paused') {
      await resume();
      return;
    }
    if (current.status === 'playing' || current.status === 'loading') {
      current.clearStarting();
      return;
    }
  }
  if (!installed && !(await downloadReciterPack(listen.reciterResourceId))) {
    store.clearStarting();
    return;
  }
  setReciterId(listen.reciterResourceId);
  await playChapter(listen.chapterId, listen.lastPositionMs);
}

/**
 * Plays one surah from a reciter, from its start, for the reciter's download page. The page installs the pack
 * before it lists the surahs, so nothing is installed here.
 */
export async function playSurahFromReciter(resourceId: number, chapterId: number): Promise<void> {
  usePlayerStore.getState().beginStarting({ kind: 'surah', resourceId, chapterId });
  setReciterId(resourceId);
  await playChapter(chapterId);
}
