import { playChapter, playFromVerse, resume } from './player';
import { usePlayerStore } from './playerStore';
import { playRecentListen, playReciter, playSurahFromReciter } from './reciter-playback';
import { downloadReciterPack } from './reciter-downloads';
import { getReciterId, resetAudioSettingsStore } from './settings';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('./player', () => ({
  playChapter: jest.fn(() => Promise.resolve()),
  playFromVerse: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
}));
jest.mock('./reciter-downloads', () => ({ downloadReciterPack: jest.fn() }));

const play = jest.mocked(playChapter);
const playAyah = jest.mocked(playFromVerse);
const resumePlayback = jest.mocked(resume);
const download = jest.mocked(downloadReciterPack);

beforeEach(() => {
  play.mockClear();
  playAyah.mockClear();
  resumePlayback.mockClear();
  download.mockReset();
  storage.remove(storageKeys.audioReciterId);
  storage.remove(storageKeys.readerLastVerseKey);
  resetAudioSettingsStore();
  usePlayerStore.setState({ chapterId: null, reciterId: null, status: 'idle', startingTarget: null });
});

describe('playReciter', () => {
  it('leaves the reciter already playing as it is, without restarting it', async () => {
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'playing' });

    await playReciter(31, true);

    expect(play).not.toHaveBeenCalled();
    expect(playAyah).not.toHaveBeenCalled();
    expect(resumePlayback).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().startingTarget).toBeNull();
  });

  it('keeps the reciter already loading as it is', async () => {
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'loading' });

    await playReciter(31, true);

    expect(playAyah).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().startingTarget).toBeNull();
  });

  it('starts the saved current ayah when the same reciter is paused', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:260');
    usePlayerStore.setState({ reciterId: 31, chapterId: 2, status: 'paused' });

    await playReciter(31, true);

    expect(playAyah).toHaveBeenCalledWith('2:260');
    expect(resumePlayback).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  it('switches to another reciter at the saved current ayah', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:260');
    usePlayerStore.setState({ reciterId: 30, chapterId: 18, status: 'playing' });

    await playReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(playAyah).toHaveBeenCalledWith('2:260');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays the saved current ayah from the start when nothing is playing yet', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');

    await playReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(download).not.toHaveBeenCalled();
    expect(playAyah).toHaveBeenCalledWith('2:255');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays from surah 1 ayah 1 when no current ayah has been saved', async () => {
    await playReciter(31, true);

    expect(playAyah).toHaveBeenCalledWith('1:1');
  });

  it('installs an uninstalled pack first, then plays the current ayah', async () => {
    storage.set(storageKeys.readerLastVerseKey, '3:1');
    download.mockResolvedValue(true);

    await playReciter(32, false);

    expect(download).toHaveBeenCalledWith(32);
    expect(getReciterId()).toBe(32);
    expect(playAyah).toHaveBeenCalledWith('3:1');
  });

  it('plays nothing, keeps the choice and clears the target when the install fails', async () => {
    download.mockResolvedValue(false);

    await playReciter(32, false);

    expect(getReciterId()).toBeNull();
    expect(playAyah).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().startingTarget).toBeNull();
  });

  it('records the reciter as the starting target before the install begins', async () => {
    let targetDuringInstall: unknown = undefined;
    download.mockImplementation(() => {
      targetDuringInstall = usePlayerStore.getState().startingTarget;
      return Promise.resolve(true);
    });

    await playReciter(32, false);

    expect(targetDuringInstall).toEqual({ kind: 'reciter', resourceId: 32 });
  });
});

describe('playRecentListen', () => {
  it('leaves the same surah playing as it is, and resumes it when paused, instead of jumping to the saved spot', async () => {
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'playing' });
    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 90_000 }, true);
    expect(play).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().startingTarget).toBeNull();

    usePlayerStore.setState({ status: 'paused' });
    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 90_000 }, true);
    expect(resumePlayback).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });

  it('sets the reciter and resumes the surah at the saved position', async () => {
    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 90_000 }, true);

    expect(getReciterId()).toBe(31);
    expect(download).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith(18, 90_000);
  });

  it('installs an uninstalled pack first, then plays from the saved position', async () => {
    download.mockResolvedValue(true);

    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 4_000 }, false);

    expect(download).toHaveBeenCalledWith(31);
    expect(getReciterId()).toBe(31);
    expect(play).toHaveBeenCalledWith(18, 4_000);
  });

  it('changes nothing and clears the target when the install fails', async () => {
    download.mockResolvedValue(false);

    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 4_000 }, false);

    expect(getReciterId()).toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().startingTarget).toBeNull();
  });

  it('records the listen as the starting target before the install begins', async () => {
    let targetDuringInstall: unknown = undefined;
    download.mockImplementation(() => {
      targetDuringInstall = usePlayerStore.getState().startingTarget;
      return Promise.resolve(true);
    });

    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 4_000 }, false);

    expect(targetDuringInstall).toEqual({ kind: 'listen', resourceId: 31, chapterId: 18 });
  });
});

describe('playSurahFromReciter', () => {
  it('chooses the reciter and plays the surah from its start, without installing anything', async () => {
    await playSurahFromReciter(31, 18);

    expect(getReciterId()).toBe(31);
    expect(play).toHaveBeenCalledWith(18);
    expect(download).not.toHaveBeenCalled();
  });

  it('records the surah as the starting target', async () => {
    let targetDuringPlay: unknown = undefined;
    play.mockImplementationOnce(() => {
      targetDuringPlay = usePlayerStore.getState().startingTarget;
      return Promise.resolve();
    });

    await playSurahFromReciter(31, 18);

    expect(targetDuringPlay).toEqual({ kind: 'surah', resourceId: 31, chapterId: 18 });
  });
});
