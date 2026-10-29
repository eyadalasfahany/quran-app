import { playChapter, resume } from './player';
import { usePlayerStore } from './playerStore';
import { playReciter } from './reciter-playback';
import { downloadReciterPack } from './reciter-downloads';
import { getReciterId, resetAudioSettingsStore } from './settings';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('./player', () => ({ playChapter: jest.fn(() => Promise.resolve()), resume: jest.fn(() => Promise.resolve()) }));
jest.mock('./reciter-downloads', () => ({ downloadReciterPack: jest.fn() }));

const play = jest.mocked(playChapter);
const resumePlayback = jest.mocked(resume);
const download = jest.mocked(downloadReciterPack);

beforeEach(() => {
  play.mockClear();
  resumePlayback.mockClear();
  download.mockReset();
  storage.remove(storageKeys.audioReciterId);
  resetAudioSettingsStore();
  usePlayerStore.setState({ chapterId: null, reciterId: null, status: 'idle' });
});

describe('playReciter', () => {
  it('leaves the reciter already playing as it is, without restarting the surah', async () => {
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'playing' });

    await playReciter(31, true);

    expect(play).not.toHaveBeenCalled();
    expect(resumePlayback).not.toHaveBeenCalled();
  });

  it('resumes the reciter already loaded when it is paused', async () => {
    usePlayerStore.setState({ reciterId: 31, chapterId: 18, status: 'paused' });

    await playReciter(31, true);

    expect(resumePlayback).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });

  it('switches to another reciter at the same surah', async () => {
    usePlayerStore.setState({ reciterId: 30, chapterId: 18, status: 'playing' });

    await playReciter(31, true);

    expect(play).toHaveBeenCalledWith(18);
  });

  it('sets the reciter and plays surah 1 when nothing is playing yet', async () => {
    await playReciter(31, true);

    expect(getReciterId()).toBe(31);
    expect(download).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith(1);
  });

  it('plays from the surah already in the player', async () => {
    usePlayerStore.setState({ chapterId: 18 });

    await playReciter(31, true);

    expect(play).toHaveBeenCalledWith(18);
  });

  it('installs an uninstalled pack first, then plays', async () => {
    download.mockResolvedValue(true);

    await playReciter(32, false);

    expect(download).toHaveBeenCalledWith(32);
    expect(getReciterId()).toBe(32);
    expect(play).toHaveBeenCalledWith(1);
  });

  it('plays nothing and keeps the choice when the install fails', async () => {
    download.mockResolvedValue(false);

    await playReciter(32, false);

    expect(getReciterId()).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });
});
