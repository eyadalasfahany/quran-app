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
