import { AppState } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { createFakeAudioPlayer, type FakeAudioPlayer } from '../../../jest/fake-audio-player';
import { openAudioTestDb } from './data/test-db';
import { nextSurah, pause, playChapter, playFromVerse, previousSurah, resetPlayerForTests, resume, restoreLastSession, seek } from './player';
import { usePlayerStore } from './playerStore';
import { readLastPosition } from './resume-model';
import { setReciterId } from './settings';

// The content database is opened by the app at start; tests hand the player an in-memory copy instead.
const mockContent: { executor: SqlExecutor | null } = { executor: null };

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockContent.executor === null) {
      throw new Error('The test content database is not open.');
    }
    return { db: undefined, executor: mockContent.executor };
  },
  useContentDb: () => ({ ready: true, error: null }),
}));

type AudioModuleMock = {
  createAudioPlayer: jest.Mock;
  setAudioModeAsync: jest.Mock;
};

const audio = jest.requireMock<AudioModuleMock>('expo-audio');
let executor: SqlExecutor;
let close: () => void;

function fakePlayer(): FakeAudioPlayer {
  const value = audio.createAudioPlayer.mock.results.at(-1)?.value as FakeAudioPlayer | undefined;
  if (value === undefined) {
    throw new Error('No player was created.');
  }
  return value;
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function seedContent(db: SqlExecutor): void {
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opening', 'makkah', 5, 7, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 286, 1, 2, 49),
     (114, 'الناس', 'An-Nas', 'Mankind', 'makkah', 21, 6, 0, 604, 604)`,
  );
  db.run(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search) VALUES
     (1, '1:1', 1, 1, 1, 1, 1, 1, 'none', 'a', 'a'),
     (7, '1:7', 1, 7, 1, 1, 1, 1, 'none', 'a', 'a'),
     (8, '2:1', 2, 1, 1, 1, 1, 2, 'none', 'a', 'a')`,
  );
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes) VALUES
     (30, 'chapter_recitations', 'Mishari', 'مشاري', 1, 1000)`,
  );
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (30, 'chapter_recitations', 1, 'a', 0, 'Mishari', 'مشاري')`,
  );
  db.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES (1, 30, 'Mishari', 'مشاري', 1)`);
  // Surah 1's row says 46000 ms, but its last timing ends at 46490 ms: the row is rounded down.
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 46000, 'mp3'),
     (200, 1, 2, 'https://example.test/2.mp3', 286000, 'mp3'),
     (1140, 1, 114, 'https://example.test/114.mp3', 20000, 'mp3')`,
  );
  db.run(
    `INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES
     (100, 1, 0, 5000),
     (100, 7, 40000, 46490)`,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetPlayerForTests();
  storage.remove(storageKeys.audioLastPosition);
  ({ executor, close } = openAudioTestDb());
  seedContent(executor);
  mockContent.executor = executor;
  setReciterId(30);
});

afterEach(() => {
  close();
  mockContent.executor = null;
});

describe('playing a surah', () => {
  it('loads the surah file, plays it, and takes the duration from the player once loaded', async () => {
    await playChapter(1);

    expect(fakePlayer().replace).toHaveBeenCalledWith({ uri: 'https://example.test/1.mp3' });
    expect(fakePlayer().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', chapterId: 1, durationMs: 46000 });

    fakePlayer().emitStatus({ playing: true, isLoaded: true, duration: 46.49, currentTime: 0.1 });
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', durationMs: 46490 });
  });

  it('sets background audio mode and lock-screen metadata with the reciter, surah and app icon', async () => {
    await playChapter(1);

    expect(audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPlayInBackground: true, playsInSilentMode: true, interruptionMode: 'doNotMix' }),
    );
    expect(fakePlayer().setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'الفاتحة', artist: 'مشاري' }),
    );
  });

  it('seeks to the verse start from its timing, even when the row duration is shorter than that end', async () => {
    await playFromVerse('1:7');

    expect(fakePlayer().replace).toHaveBeenCalledWith({ uri: 'https://example.test/1.mp3' });
    expect(fakePlayer().seekTo).toHaveBeenCalledWith(40);
    expect(fakePlayer().play).toHaveBeenCalled();
  });

  it('starts from 0 when the audio has no timings for the verse', async () => {
    await playFromVerse('2:1');

    expect(fakePlayer().seekTo).not.toHaveBeenCalled();
    expect(fakePlayer().play).toHaveBeenCalled();
  });

  it('advances to the next surah when the current one finishes', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });
    fakePlayer().emitStatus({ didJustFinish: true });
    await flush();

    expect(fakePlayer().replace).toHaveBeenLastCalledWith({ uri: 'https://example.test/2.mp3' });
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading' });
  });

  it('stops after surah 114 instead of advancing', async () => {
    await playChapter(114);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    fakePlayer().emitStatus({ didJustFinish: true });
    await flush();

    expect(fakePlayer().replace).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', positionMs: 0 });
  });
});

describe('error paths', () => {
  it('reports no reciter when none is installed', async () => {
    executor.run('DELETE FROM installed_resources');
    executor.run('DELETE FROM catalog_resources');

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'no-reciter' });
  });

  it('reports not-installed when the surah has no audio row', async () => {
    executor.run('DELETE FROM chapter_audio_files WHERE chapter_id = 2');

    await playChapter(2);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'not-installed' });
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('reports not-installed when the recitation pack is missing', async () => {
    executor.run('DELETE FROM recitations');

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'not-installed' });
  });

  it('reports load-failed when the player refuses the file', async () => {
    audio.createAudioPlayer.mockImplementationOnce(() => {
      const player = createFakeAudioPlayer();
      player.replace.mockImplementation(() => {
        throw new Error('bad file');
      });
      return player;
    });

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
  });

  it('reports not-found for a 404 in the status event', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ error: 'Response code: 404' });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'not-found' });
  });

  it('reports load-failed for an offline stream', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ error: 'The Internet connection appears to be offline' });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
  });

  it('reports an unknown verse and an out-of-range surah without calling the player', async () => {
    await playFromVerse('9:9');
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'invalid-verse' });

    await playChapter(115);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'invalid-chapter' });
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });
});

describe('pause, resume and seek', () => {
  it('pauses, saves the position and keeps the surah', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    fakePlayer().currentTime = 12.5;

    pause();

    expect(fakePlayer().pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('paused');
    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 1, positionMs: 12500 });
  });

  it('resumes a loaded surah without reloading it', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    pause();

    await resume();

    expect(fakePlayer().replace).toHaveBeenCalledTimes(1);
    expect(fakePlayer().play).toHaveBeenCalledTimes(2);
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('follows the system pausing and playing it again (lock screen, headphones)', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    fakePlayer().currentTime = 3;

    fakePlayer().emitStatus({ playing: false, isLoaded: true, currentTime: 3 });
    expect(usePlayerStore.getState().status).toBe('paused');
    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 1, positionMs: 3000 });

    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('does not cancel a finished load when a stale pause arrives', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    fakePlayer().emitStatus({ playing: false, isLoaded: true });
    expect(usePlayerStore.getState().status).toBe('paused');
  });

  it('seeks inside the loaded file without clamping to the row duration', async () => {
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });

    seek(46490);
    expect(fakePlayer().seekTo).toHaveBeenCalledWith(46.49);
    expect(usePlayerStore.getState().positionMs).toBe(46490);

    seek(-5);
    expect(usePlayerStore.getState().positionMs).toBe(0);
  });

  it('saves the resume state when the app goes to the background', async () => {
    const addListener = jest.spyOn(AppState, 'addEventListener');
    await playChapter(1);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    fakePlayer().currentTime = 7;

    const listener = addListener.mock.calls.find(([event]) => event === 'change')?.[1] as (state: string) => void;
    listener('background');

    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 1, positionMs: 7000 });
    addListener.mockRestore();
  });
});

describe('restoring the last session', () => {
  it('restores the saved position as paused without playing', () => {
    storage.set(storageKeys.audioLastPosition, JSON.stringify({ reciterId: 30, chapterId: 2, positionMs: 5000 }));

    expect(restoreLastSession()).toBe(true);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'paused', chapterId: 2, reciterId: 30, positionMs: 5000 });
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
    expect(audio.setAudioModeAsync).not.toHaveBeenCalled();
  });

  it('ignores malformed saved JSON', () => {
    storage.set(storageKeys.audioLastPosition, '{broken');

    expect(restoreLastSession()).toBe(false);
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('loads the file at the saved position when resumed after a restore', async () => {
    storage.set(storageKeys.audioLastPosition, JSON.stringify({ reciterId: 30, chapterId: 2, positionMs: 5000 }));
    restoreLastSession();

    await resume();

    expect(fakePlayer().replace).toHaveBeenCalledWith({ uri: 'https://example.test/2.mp3' });
    expect(fakePlayer().seekTo).toHaveBeenCalledWith(5);
    expect(fakePlayer().play).toHaveBeenCalled();
  });
});

describe('next and previous surah', () => {
  it('moves to the next surah', async () => {
    await playChapter(1);
    await nextSurah();
    expect(usePlayerStore.getState().chapterId).toBe(2);
    expect(fakePlayer().replace).toHaveBeenLastCalledWith({ uri: 'https://example.test/2.mp3' });
  });

  it('moves to the previous surah and stops at 1', async () => {
    await playChapter(2);
    await previousSurah();
    expect(usePlayerStore.getState().chapterId).toBe(1);

    await previousSurah();
    expect(usePlayerStore.getState().chapterId).toBe(1);
  });

  it('stops at 114 when asked for the next surah', async () => {
    await playChapter(114);
    fakePlayer().emitStatus({ playing: true, isLoaded: true });
    await nextSurah();

    expect(fakePlayer().pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
  });
});
