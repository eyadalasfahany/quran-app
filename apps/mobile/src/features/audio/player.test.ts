import { AppState } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { createFakeAudioPlaylist, type FakeAudioPlaylist } from '../../../jest/fake-audio-player';
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
  createAudioPlaylist: jest.Mock;
  setAudioModeAsync: jest.Mock;
};

const audio = jest.requireMock<AudioModuleMock>('expo-audio');
let executor: SqlExecutor;
let close: () => void;

/** The playlist the engine built most recently. */
function fakePlaylist(): FakeAudioPlaylist {
  const value = audio.createAudioPlaylist.mock.results.at(-1)?.value as FakeAudioPlaylist | undefined;
  if (value === undefined) {
    throw new Error('No playlist was created.');
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

/** Husary (31): the flagged default, installed with surah 1 only. */
function seedHusary(db: SqlExecutor): void {
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
     (31, 'chapter_recitations', 'Husary', 'الحصري', 1, 2000, 1)`,
  );
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (31, 'chapter_recitations', 1, 'b', 0, 'Husary', 'الحصري')`,
  );
  db.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES (2, 31, 'Husary', 'الحصري', 0)`);
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (300, 2, 1, 'https://example.test/husary-1.mp3', 46000, 'mp3')`,
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
  resetPlayerForTests();
  close();
  mockContent.executor = null;
});

describe('playing a surah', () => {
  it('builds one playlist of the reciter surah files and plays the surah at its index', async () => {
    await playChapter(1);

    expect(audio.createAudioPlaylist).toHaveBeenCalledWith({
      sources: [{ uri: 'https://example.test/1.mp3' }, { uri: 'https://example.test/2.mp3' }, { uri: 'https://example.test/114.mp3' }],
    });
    expect(fakePlaylist().skipTo).not.toHaveBeenCalled();
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', chapterId: 1, durationMs: 46000 });

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49, currentTime: 0.1 });
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', durationMs: 46490 });
  });

  it('sets background audio mode and lock-screen metadata with the reciter, surah and app icon', async () => {
    await playChapter(1);

    expect(audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPlayInBackground: true, playsInSilentMode: true, interruptionMode: 'doNotMix' }),
    );
    expect(fakePlaylist().setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'الفاتحة', artist: 'مشاري' }),
      { showNextTrack: true, showPreviousTrack: true },
    );
  });

  it('seeks to the verse start from its timing, even when the row duration is shorter than that end', async () => {
    await playFromVerse('1:7');

    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(40);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('starts from 0 when the audio has no timings for the verse', async () => {
    await playFromVerse('2:1');

    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(fakePlaylist().skipTo).toHaveBeenCalledWith(1);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('moves to the next surah when the playlist advances, and takes its placeholder duration', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });
    fakePlaylist().emitTrackChanged(1);

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'playing', positionMs: 0, durationMs: 286000 });
  });

  it('stops after the last surah instead of advancing', async () => {
    await playChapter(114);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().emitStatus({ didJustFinish: true });

    expect(fakePlaylist().pause).toHaveBeenCalled();
    // The only move was the one that loaded surah 114 (index 2); nothing moved past it.
    expect(fakePlaylist().skipTo).toHaveBeenCalledTimes(1);
    expect(fakePlaylist().currentIndex).toBe(2);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', positionMs: 0 });
  });
});

describe('default reciter', () => {
  beforeEach(() => {
    storage.remove(storageKeys.audioReciterId);
    seedHusary(executor);
  });

  it('plays the flagged default when nothing is saved, even though an installed reciter comes first', async () => {
    await playChapter(1);

    expect(usePlayerStore.getState().reciterId).toBe(31);
  });

  it('plays the saved reciter over the flagged default', async () => {
    setReciterId(30);

    await playChapter(1);

    expect(usePlayerStore.getState().reciterId).toBe(30);
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
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('reports not-installed when the recitation pack is missing', async () => {
    executor.run('DELETE FROM recitations');

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'not-installed' });
  });

  it('reports load-failed when the player refuses to play', async () => {
    audio.createAudioPlaylist.mockImplementationOnce((options: { sources: { uri: string }[] }) => {
      const playlist = createFakeAudioPlaylist(options.sources);
      playlist.play.mockImplementation(() => {
        throw new Error('bad file');
      });
      return playlist;
    });

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
  });

  it('reports an unknown verse and an out-of-range surah without building a playlist', async () => {
    await playFromVerse('9:9');
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'invalid-verse' });

    await playChapter(115);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'invalid-chapter' });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });
});

describe('load watchdog', () => {
  it('fails a track that has not loaded 10 seconds after play, and pauses', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);

      jest.advanceTimersByTime(9_999);
      expect(usePlayerStore.getState().status).toBe('loading');

      jest.advanceTimersByTime(1);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
      expect(fakePlaylist().pause).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not fail a track that loads in time', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);
      jest.advanceTimersByTime(5_000);
      fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });

      jest.advanceTimersByTime(10_000);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', error: null });
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts again for a track the system moves to while playing', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);
      fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });
      fakePlaylist().emitTrackChanged(1);

      jest.advanceTimersByTime(10_000);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed', chapterId: 2 });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('track changes the system makes', () => {
  it('stops on a track that never loaded when the system skips past it (offline), without running the queue on', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);
      fakePlaylist().emitStatus({ playing: true, isLoaded: false });
      // iOS skips about 15 s after play when offline; the watchdog's 10 s is longer than the 5 s threshold,
      // so stop short of it to see the skip handling on its own.
      jest.advanceTimersByTime(6_000);

      fakePlaylist().emitTrackChanged(1);

      expect(fakePlaylist().pause).toHaveBeenCalled();
      expect(fakePlaylist().skipTo).toHaveBeenCalledTimes(1);
      expect(fakePlaylist().skipTo).toHaveBeenCalledWith(0);
      expect(fakePlaylist().currentIndex).toBe(0);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed', chapterId: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('treats a quick skip past a loading track (lock-screen next) as a skip, not a failure', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);
      fakePlaylist().emitStatus({ playing: true, isLoaded: false });
      jest.advanceTimersByTime(1_000);

      fakePlaylist().emitTrackChanged(1);

      expect(fakePlaylist().skipTo).not.toHaveBeenCalled();
      expect(usePlayerStore.getState()).toMatchObject({ error: null, chapterId: 2 });
      // The new track still has to load within 10 s.
      jest.advanceTimersByTime(10_000);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed', chapterId: 2 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not treat a surah change the user asked for while loading as a failure', async () => {
    await playChapter(1);

    await nextSurah();

    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', error: null, chapterId: 2 });
    expect(fakePlaylist().next).toHaveBeenCalled();
  });

  it('updates the lock-screen metadata to the new surah', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });

    fakePlaylist().emitTrackChanged(1);

    expect(fakePlaylist().updateLockScreenMetadata).toHaveBeenCalledWith(expect.objectContaining({ title: 'البقرة', artist: 'مشاري' }));
    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 2, positionMs: 0 });
  });

  it('skips surahs with no audio row when moving on', async () => {
    await playChapter(2);

    await nextSurah();

    expect(usePlayerStore.getState().chapterId).toBe(114);
    expect(fakePlaylist().currentIndex).toBe(2);
  });
});

describe('one playlist per reciter', () => {
  it('reuses the playlist while the reciter is unchanged', async () => {
    await playChapter(1);
    await playChapter(2);

    expect(audio.createAudioPlaylist).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the playlist when the reciter changes, and destroys the old one', async () => {
    seedHusary(executor);
    await playChapter(1);
    const first = fakePlaylist();

    setReciterId(31);
    await playChapter(1);

    expect(audio.createAudioPlaylist).toHaveBeenCalledTimes(2);
    expect(first.destroy).toHaveBeenCalled();
    expect(audio.createAudioPlaylist).toHaveBeenLastCalledWith({ sources: [{ uri: 'https://example.test/husary-1.mp3' }] });
    expect(usePlayerStore.getState().reciterId).toBe(31);
  });

  it('plays at the store speed and follows speed changes', async () => {
    usePlayerStore.getState().setSpeed(1.5);
    await playChapter(1);
    expect(fakePlaylist().playbackRate).toBe(1.5);

    usePlayerStore.getState().setSpeed(2);
    expect(fakePlaylist().playbackRate).toBe(2);
  });
});

describe('pause, resume and seek', () => {
  it('pauses, saves the position and keeps the surah', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().currentTime = 12.5;

    pause();

    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('paused');
    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 1, positionMs: 12500 });
  });

  it('resumes a loaded surah without rebuilding the playlist', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    pause();

    await resume();

    expect(audio.createAudioPlaylist).toHaveBeenCalledTimes(1);
    expect(fakePlaylist().play).toHaveBeenCalledTimes(2);
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('follows the system pausing and playing it again (lock screen, headphones)', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().currentTime = 3;

    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 3 });
    expect(usePlayerStore.getState().status).toBe('paused');
    expect(readLastPosition()).toEqual({ reciterId: 30, chapterId: 1, positionMs: 3000 });

    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('does not cancel a finished load when a stale pause arrives', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().emitStatus({ playing: false, isLoaded: true });
    expect(usePlayerStore.getState().status).toBe('paused');
  });

  it('seeks inside the loaded file without clamping to the row duration', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 46.49 });

    seek(46490);
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(46.49);
    expect(usePlayerStore.getState().positionMs).toBe(46490);

    seek(-5);
    expect(usePlayerStore.getState().positionMs).toBe(0);
  });

  it('saves the resume state when the app goes to the background', async () => {
    const addListener = jest.spyOn(AppState, 'addEventListener');
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().currentTime = 7;

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
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
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

    expect(fakePlaylist().skipTo).toHaveBeenCalledWith(1);
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(5);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });
});

describe('next and previous surah', () => {
  it('moves to the next surah', async () => {
    await playChapter(1);
    await nextSurah();
    expect(usePlayerStore.getState().chapterId).toBe(2);
    expect(fakePlaylist().next).toHaveBeenCalled();
  });

  it('moves to the previous surah and starts the first one again', async () => {
    await playChapter(2);
    await previousSurah();
    expect(usePlayerStore.getState().chapterId).toBe(1);

    await previousSurah();
    expect(usePlayerStore.getState().chapterId).toBe(1);
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(0);
  });

  it('stops at 114 when asked for the next surah', async () => {
    await playChapter(114);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    await nextSurah();

    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('keeps the playlist usable after a flush', async () => {
    await playChapter(1);
    await flush();
    expect(fakePlaylist().listenerCount('trackChanged')).toBe(1);
  });
});
