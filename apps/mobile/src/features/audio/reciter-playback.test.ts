import { playChapter, playFromVerse, resume, switchReciter } from './player';
import { usePlayerStore } from './playerStore';
import {
  clearPendingPackPick,
  clearPendingPackPickFor,
  currentAyahKey,
  pickDownloadedReciter,
  pickInstalledReciter,
  playRecentListen,
  playReciter,
  playSurahFromReciter,
  selectReciter,
} from './reciter-playback';
import { downloadReciterPack } from './reciter-downloads';
import { surahAvailability } from './data/surah-availability';
import { getReciterId, resetAudioSettingsStore, setReciterId } from './settings';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('./player', () => ({
  playChapter: jest.fn(() => Promise.resolve()),
  playFromVerse: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  switchReciter: jest.fn(() => Promise.resolve('switched')),
}));
jest.mock('./reciter-downloads', () => ({ downloadReciterPack: jest.fn() }));
jest.mock('@/core/db/content/open', () => ({ openContentDb: () => ({ db: undefined, executor: {} }) }));
jest.mock('./data/surah-availability', () => ({ surahAvailability: jest.fn(() => 'available') }));

const play = jest.mocked(playChapter);
const playAyah = jest.mocked(playFromVerse);
const resumePlayback = jest.mocked(resume);
const download = jest.mocked(downloadReciterPack);
const switchTo = jest.mocked(switchReciter);
const availability = jest.mocked(surahAvailability);

beforeEach(() => {
  play.mockClear();
  playAyah.mockClear();
  resumePlayback.mockClear();
  switchTo.mockReset();
  switchTo.mockResolvedValue('switched');
  availability.mockReset();
  availability.mockReturnValue('available');
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

/** A download the test settles by hand, so the pick can be cancelled or replaced while it runs. */
function heldDownload() {
  let settle!: (installed: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

describe('currentAyahKey (ADR 0046: the one current ayah)', () => {
  it('is the saved reading anchor, and the first ayah when none is saved', () => {
    expect(currentAyahKey()).toBe('1:1');
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    expect(currentAyahKey()).toBe('2:255');
  });
});

describe('selectReciter (ADR 0062 decision 7)', () => {
  it('saves the choice and starts nothing when idle', async () => {
    await selectReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(switchTo).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(playAyah).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('saves the choice and moves the paused track to the new reciter, without playing', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'paused' });

    await selectReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(switchTo).toHaveBeenCalledWith(31, { autoplay: false });
  });

  it('while another reciter plays switches at the current ayah and keeps playing', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });

    await selectReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(switchTo).toHaveBeenCalledWith(31, { autoplay: false });
  });

  it('while loading switches the same way', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'loading' });

    await selectReciter(31, true);

    expect(switchTo).toHaveBeenCalledWith(31, { autoplay: false });
  });

  it('shows the buffering ring while the switch plays', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    let targetDuringSwitch: unknown = undefined;
    switchTo.mockImplementationOnce(() => {
      targetDuringSwitch = usePlayerStore.getState().startingTarget;
      return Promise.resolve('switched');
    });

    await selectReciter(31, true);

    expect(targetDuringSwitch).toEqual({ kind: 'reciter', resourceId: 31 });
  });

  it('does not show the buffering ring for a paused move, which starts nothing', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'paused' });
    let targetDuringSwitch: unknown = 'unset';
    switchTo.mockImplementationOnce(() => {
      targetDuringSwitch = usePlayerStore.getState().startingTarget;
      return Promise.resolve('switched');
    });

    await selectReciter(31, true);

    expect(targetDuringSwitch).toBeNull();
    expect(usePlayerStore.getState().startingTarget).toBeNull();
  });

  it('on the reciter already playing does nothing, and writes no choice', async () => {
    setReciterId(30);
    usePlayerStore.setState({ reciterId: 31, chapterId: 1, status: 'playing' });

    await selectReciter(31, true);

    expect(switchTo).not.toHaveBeenCalled();
    expect(getReciterId()).toBe(30);
  });

  it('with an uninstalled pack while idle only saves the choice and starts no download', async () => {
    await selectReciter(33, false);

    expect(getReciterId()).toBe(33);
    expect(download).not.toHaveBeenCalled();
    expect(switchTo).not.toHaveBeenCalled();
  });

  it('with an uninstalled pack while another plays downloads it, then switches at the current ayah and keeps playing', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);

    const done = selectReciter(33, false);
    expect(download).toHaveBeenCalledWith(33);
    expect(switchTo).not.toHaveBeenCalled();

    held.settle(true);
    await done;

    expect(switchTo).toHaveBeenCalledWith(33, { autoplay: false });
  });

  it('a pending download switch is cancelled when another reciter is selected before it finishes', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const first = heldDownload();
    download.mockReturnValueOnce(first.promise);
    const pending = selectReciter(33, false);

    await selectReciter(32, true);
    first.settle(true);
    await pending;

    expect(switchTo).toHaveBeenCalledTimes(1);
    expect(switchTo).toHaveBeenCalledWith(32, { autoplay: false });
    expect(switchTo).not.toHaveBeenCalledWith(33, expect.anything());
  });

  it('a pending download switch is cancelled when playback pauses before it finishes', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);
    const pending = selectReciter(33, false);

    usePlayerStore.setState({ status: 'paused' });
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalled();
    expect(getReciterId()).toBe(33);
  });

  it('a pending download switch is cancelled when playback stops before it finishes', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);
    const pending = selectReciter(33, false);

    usePlayerStore.setState({ status: 'idle' });
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalled();
  });

  it('a pending download switch is cancelled by clearPendingPackPickFor for that reciter', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);
    const pending = selectReciter(33, false);

    clearPendingPackPickFor(33);
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalled();
  });

  it('a failed download keeps the current playback and switches nothing', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    download.mockResolvedValueOnce(false);

    await selectReciter(33, false);

    expect(switchTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', reciterId: 30, chapterId: 1 });
    expect(getReciterId()).toBe(30);
  });

  it('failure after the user picked another reciter keeps the newer choice', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const first = heldDownload();
    download.mockReturnValueOnce(first.promise);
    const pending = selectReciter(33, false);

    await selectReciter(32, true);
    first.settle(false);
    await pending;

    expect(getReciterId()).toBe(32);
    expect(switchTo).toHaveBeenCalledTimes(1);
    expect(switchTo).toHaveBeenCalledWith(32, { autoplay: false });
  });

  it('the download-then-switch hands a reciter without the surah to the engine, which shows the unavailable state', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 2, status: 'playing' });
    download.mockResolvedValueOnce(true);
    switchTo.mockResolvedValueOnce('unavailable');

    await selectReciter(33, false);

    expect(switchTo).toHaveBeenCalledWith(33, { autoplay: false });
  });
});

describe('pickInstalledReciter', () => {
  it('selects the reciter when nothing is loaded and switches when a surah is loaded', async () => {
    await pickInstalledReciter(31);
    expect(getReciterId()).toBe(31);
    expect(switchTo).not.toHaveBeenCalled();

    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'paused' });
    await pickInstalledReciter(32);
    expect(switchTo).toHaveBeenCalledWith(32, { autoplay: false });
  });
});

describe('pickDownloadedReciter (decision 5: a finished download auto-plays)', () => {
  it('switches and plays after the pack installs, from the current ayah', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    download.mockResolvedValueOnce(true);

    await pickDownloadedReciter(33);

    expect(switchTo).toHaveBeenCalledWith(33, { autoplay: true });
  });

  it('auto-plays from the current ayah when nothing was loaded', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    download.mockResolvedValueOnce(true);

    await pickDownloadedReciter(33);

    expect(getReciterId()).toBe(33);
    expect(playAyah).toHaveBeenCalledWith('2:255');
    expect(switchTo).not.toHaveBeenCalled();
  });

  it('does not switch when the installed pack has no file for the surah', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 2, status: 'paused' });
    download.mockResolvedValueOnce(true);
    availability.mockReturnValueOnce('unavailable');

    await pickDownloadedReciter(33);

    expect(switchTo).not.toHaveBeenCalled();
  });

  it('does not switch when another reciter was picked meanwhile', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const first = heldDownload();
    download.mockReturnValueOnce(first.promise);
    const pending = pickDownloadedReciter(33);

    await pickInstalledReciter(31);
    first.settle(true);
    await pending;

    expect(switchTo).toHaveBeenCalledTimes(1);
    expect(switchTo).toHaveBeenCalledWith(31, { autoplay: false });
  });

  it('does not switch when the list unmounted (clearPendingPackPick)', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);
    const pending = pickDownloadedReciter(33);

    clearPendingPackPick();
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalled();
  });

  it('does not switch when the install fails or is cancelled', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    download.mockResolvedValueOnce(false);

    await pickDownloadedReciter(33);

    expect(switchTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', reciterId: 30 });
  });

  it('a second download replaces the pending pick, so only the second one switches', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const first = heldDownload();
    const second = heldDownload();
    download.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const pendingFirst = pickDownloadedReciter(33);
    const pendingSecond = pickDownloadedReciter(34);
    first.settle(true);
    await pendingFirst;
    expect(switchTo).not.toHaveBeenCalled();

    second.settle(true);
    await pendingSecond;
    expect(switchTo).toHaveBeenCalledTimes(1);
    expect(switchTo).toHaveBeenCalledWith(34, { autoplay: true });
  });
});

describe('playRecentListen makes its reciter the selected one (decided Q10)', () => {
  it('resuming the same surah paused also selects the listen reciter', async () => {
    setReciterId(30);
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'paused' });

    await playRecentListen({ reciterResourceId: 31, chapterId: 18, lastPositionMs: 90_000 }, true);

    expect(getReciterId()).toBe(31);
    expect(resumePlayback).toHaveBeenCalledTimes(1);
  });
});


describe('starting another reciter cancels a pending download-then-switch (ADR 0062 decision 7, Q12)', () => {
  /** Another reciter (33) is picked while 30 plays; his pack is still downloading. */
  function pendingDownloadFor33() {
    usePlayerStore.setState({ reciterId: 30, chapterId: 1, status: 'playing' });
    const held = heldDownload();
    download.mockReturnValueOnce(held.promise);
    return { pending: selectReciter(33, false), held };
  }

  it('playReciter cancels it: the download finishes but nothing switches to 33', async () => {
    const { pending, held } = pendingDownloadFor33();

    await playReciter(32, true);
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalledWith(33, expect.anything());
    expect(getReciterId()).toBe(32);
  });

  it('playRecentListen cancels it: the download finishes but nothing switches to 33', async () => {
    const { pending, held } = pendingDownloadFor33();

    await playRecentListen({ reciterResourceId: 32, chapterId: 2, lastPositionMs: 0 }, true);
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalledWith(33, expect.anything());
    expect(getReciterId()).toBe(32);
  });

  it('playSurahFromReciter cancels it: the download finishes but nothing switches to 33', async () => {
    const { pending, held } = pendingDownloadFor33();

    await playSurahFromReciter(32, 2);
    held.settle(true);
    await pending;

    expect(switchTo).not.toHaveBeenCalledWith(33, expect.anything());
    expect(getReciterId()).toBe(32);
  });
});
