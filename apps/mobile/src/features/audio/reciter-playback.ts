import { playChapter, resume } from './player';
import { usePlayerStore } from './playerStore';
import { setReciterId } from './settings';
import { downloadReciterPack } from './reciter-downloads';

/**
 * Plays a reciter from the current surah (or surah 1). An uninstalled pack is installed first; if that
 * fails, nothing changes. The reciter already loaded is not restarted: playing stays as it is, and paused
 * resumes where it stopped.
 * TODO(phase 3 step 3): while playing, switch at the current ayah's startMs in the new file. Until then
 * the surah starts from 0.
 */
export async function playReciter(resourceId: number, installed: boolean): Promise<void> {
  const current = usePlayerStore.getState();
  if (current.reciterId === resourceId && current.chapterId !== null) {
    if (current.status === 'paused') {
      await resume();
    }
    if (current.status !== 'idle' && current.status !== 'error') {
      return;
    }
  }
  if (!installed && !(await downloadReciterPack(resourceId))) {
    return;
  }
  setReciterId(resourceId);
  await playChapter(usePlayerStore.getState().chapterId ?? 1);
}

/**
 * Plays a recent listen: its reciter, from the saved position of its surah (Home's «آخر ما استمعت إليه»). An
 * uninstalled pack is installed first; if that fails, nothing changes.
 */
export async function playRecentListen(
  listen: { reciterResourceId: number; chapterId: number; lastPositionMs: number },
  installed: boolean,
): Promise<void> {
  // The surah already loaded with this reciter is not restarted at the saved position, which can be up to
  // 15 s behind: playing stays as it is, and paused resumes where it stopped.
  const current = usePlayerStore.getState();
  if (current.reciterId === listen.reciterResourceId && current.chapterId === listen.chapterId) {
    if (current.status === 'paused') {
      await resume();
      return;
    }
    if (current.status === 'playing' || current.status === 'loading') {
      return;
    }
  }
  if (!installed && !(await downloadReciterPack(listen.reciterResourceId))) {
    return;
  }
  setReciterId(listen.reciterResourceId);
  await playChapter(listen.chapterId, listen.lastPositionMs);
}
