import { getNetworkStateAsync } from 'expo-network';
import { AppState, Image } from 'react-native';

import { resetNetworkStateForTests, startNetworkWatch, useNetworkStatus, ONLINE_DEBOUNCE_MS } from '@/core/network/network-state';
import { storage, storageKeys } from '@/core/storage/mmkv';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { createFakeAudioPlaylist, type FakeAudioPlaylist, type FakeAudioPlaylistStatus } from '../../../jest/fake-audio-player';
import * as timings from './data/timings';
import { upsertDownload, type DownloadRow } from './data/downloads';
import { listRecentListens } from './data/recent-listens';
import { openAudioTestDb } from './data/test-db';
import {
  HIGHLIGHT_LAG_MS,
  switchReciter,
  nextAyah,
  nextSurah,
  pause,
  playChapter,
  playFromVerse,
  previousAyah,
  previousSurah,
  resetPlayerForTests,
  resume,
  restoreLastSession,
  seek,
  setRepeat,
} from './player';
import { usePlayerStore } from './playerStore';
import { useSkipNoticeStore, type SkipNotice } from './skip-notice';
import { readLastPosition } from './resume-model';
import { getReciterId, setReciterId } from './settings';
import { playVerse } from './play-verse';
import { playReciter, playSurahFromReciter } from './reciter-playback';
import { openUserTestStore } from '../../../jest/user-test-db';
import { putFile, resetFakeFileSystem } from '../../../jest/fake-file-system';

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

// The personal database holds the recent listens; tests hand the engine an in-memory copy.
const mockUser: { executor: SqlExecutor | null } = { executor: null };

jest.mock('@/core/db/user/open', () => ({
  openUserDb: () => {
    if (mockUser.executor === null) {
      throw new Error('The test user database is not open.');
    }
    return { db: undefined, executor: mockUser.executor };
  },
  useUserDb: () => ({ ready: true, error: null }),
}));

type AudioModuleMock = {
  createAudioPlaylist: jest.Mock;
  setAudioModeAsync: jest.Mock;
};

const audio = jest.requireMock<AudioModuleMock>('expo-audio');
let executor: SqlExecutor;
let close: () => void;
let userDatabase: { close: () => void };

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
  // Each surah's verses_count matches the timings its fixtures seed, because timings that miss an ayah are dropped
  // (ADR 0052): surah 1 has two ayahs here (verse ids 1 and 7, with the gap the gap tests use), surahs 2 and 114 one.
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opening', 'makkah', 5, 2, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 1, 1, 2, 49),
     (114, 'الناس', 'An-Nas', 'Mankind', 'makkah', 21, 1, 0, 604, 604)`,
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
  const user = openUserTestStore();
  mockUser.executor = user.store.db ?? null;
  userDatabase = user.database;
  setReciterId(30);
});

afterEach(() => {
  resetPlayerForTests();
  close();
  userDatabase.close();
  mockContent.executor = null;
  mockUser.executor = null;
});

describe('playing a surah', () => {
  it('builds one playlist of the reciter surah files and plays the surah at its index', async () => {
    await playChapter(1);

    expect(audio.createAudioPlaylist).toHaveBeenCalledWith({
      sources: [{ uri: 'https://example.test/1.mp3' }, { uri: 'https://example.test/2.mp3' }, { uri: 'https://example.test/114.mp3' }],
      updateInterval: 100,
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

  it('leaves out artwork when the icon resolves to a drawable name, as in an Android release build', async () => {
    const resolve = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({ uri: 'assets_images_icon', width: 1, height: 1, scale: 1 });

    await playChapter(1);

    expect(fakePlaylist().setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'الفاتحة', artworkUrl: undefined }),
      expect.anything(),
    );
    resolve.mockRestore();
  });

  it('seeks to the verse start from its timing, even when the row duration is shorter than that end', async () => {
    await playFromVerse('1:7');

    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(40);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('seeks to the first word when it starts before the ayah, so the word is not clipped', async () => {
    seedAyahs(executor);

    await playFromVerse('1:2');

    // Ayah 1:2 starts at 5000 ms, but its first word segment starts at 4950 ms.
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(4.95);
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

  it('reports surah-unavailable when the pack is installed but has no row for the surah', async () => {
    executor.run('DELETE FROM chapter_audio_files WHERE chapter_id = 2');

    await playChapter(2);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'surah-unavailable' });
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
    expect(audio.createAudioPlaylist).toHaveBeenLastCalledWith({ sources: [{ uri: 'https://example.test/husary-1.mp3' }], updateInterval: 100 });
    expect(usePlayerStore.getState().reciterId).toBe(31);
  });

  it('creates the playlist at the default rate', async () => {
    await playChapter(1);

    // The Quran player has no speed control, so the engine never assigns a rate: the fake keeps its initial 1.
    expect(fakePlaylist().playbackRate).toBe(1);
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

/** Surah 1 with four ayahs: 1:1 at 0 to 5 s; 1:2 at 5 to 10 s, whose first word starts 50 ms early; 1:3 at 10 to 15 s; a gap; 1:4 at 16 to 20 s. */
function seedAyahs(db: SqlExecutor): void {
  db.run(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search) VALUES
     (2, '1:2', 1, 2, 1, 1, 1, 1, 'none', 'a', 'a'),
     (3, '1:3', 1, 3, 1, 1, 1, 1, 'none', 'a', 'a'),
     (4, '1:4', 1, 4, 1, 1, 1, 1, 'none', 'a', 'a')`,
  );
  db.run('DELETE FROM recitation_timings WHERE audio_file_id = 100');
  db.run('UPDATE chapters SET verses_count = 4 WHERE id = 1');
  db.run(
    `INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms, segments) VALUES
     (100, 1, 0, 5000, '[[1,0,2000],[2,2000,4000],[3,4000,5000]]'),
     (100, 2, 5000, 10000, '[[1,4950,6000],[2,6000,9000]]'),
     (100, 3, 10000, 15000, NULL),
     (100, 4, 16000, 20000, NULL)`,
  );
}

/** Surah 2's file has one ayah (2:1, verse 8) from 0 to 6 s. */
function seedSurahTwoTimings(db: SqlExecutor): void {
  db.run('INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (200, 8, 0, 6000)');
}

/** Reports the loaded surah at `seconds`, the way the playlist does on each tick. */
function reportAt(seconds: number, extra: Partial<FakeAudioPlaylistStatus> = {}): void {
  fakePlaylist().currentTime = seconds;
  fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: seconds, duration: 20, ...extra });
}

/** Reports the position at which `seconds` is heard: the decoded position runs HIGHLIGHT_LAG_MS ahead. */
function heardAt(seconds: number): void {
  reportAt(seconds + HIGHLIGHT_LAG_MS / 1000);
}

describe('the active ayah and word', () => {
  beforeEach(() => {
    seedAyahs(executor);
  });

  it('follows the status times: ayah and word, at the boundaries, in gaps and on the last ayah', async () => {
    await playChapter(1);

    heardAt(1.5);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 1, activeWord: 1 });
    heardAt(2.5);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 1, activeWord: 2 });
    heardAt(5);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 2, activeWord: 1 });
    heardAt(12);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3, activeWord: null });
    heardAt(15.5);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3, activeWord: null });
    heardAt(18);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 4, activeWord: null });
    heardAt(25);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 4, activeWord: null });
  });

  it('plays with no highlight when the loaded audio runs far past its timings, and stays so on replay', async () => {
    await playChapter(1);

    // The timings end at 20 s, but the file is 120 s long: they were made for another recording (ADR 0052).
    reportAt(1.5, { duration: 120 });
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null });
    reportAt(12, { duration: 120 });
    expect(usePlayerStore.getState().activeVerseId).toBeNull();

    await playChapter(1);
    reportAt(1.5, { duration: 20 });
    expect(usePlayerStore.getState().activeVerseId).toBeNull();
  });

  it('holds the highlight HIGHLIGHT_LAG_MS behind the decoded position, so it moves when the word is heard', async () => {
    await playChapter(1);

    // Ayah 2 starts at 5 s. Decoded at 5 s, it isn't heard yet; the highlight stays on ayah 1.
    reportAt(5);
    expect(usePlayerStore.getState().activeVerseId).toBe(1);
    reportAt(5 + HIGHLIGHT_LAG_MS / 1000);
    expect(usePlayerStore.getState().activeVerseId).toBe(2);
  });

  it('highlights in the same call as the status update, with the tick at 100 ms', async () => {
    jest.useFakeTimers();
    try {
      await playChapter(1);
      expect(audio.createAudioPlaylist.mock.calls.at(-1)?.[0]).toMatchObject({ updateInterval: 100 });

      // No timer is advanced: the highlight is set before the status callback returns.
      heardAt(5);
      expect(usePlayerStore.getState().activeVerseId).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears on a track change until the next status update', async () => {
    await playChapter(1);
    reportAt(1.5);

    fakePlaylist().emitTrackChanged(1);

    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null, chapterId: 2 });
  });

  it('clears on stop', async () => {
    seedSurahTwoTimings(executor);
    executor.run("INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (1140, 1, 0, 20000)");
    await playChapter(114);
    reportAt(5);
    expect(usePlayerStore.getState().activeVerseId).toBe(1);

    await nextAyah();

    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', activeVerseId: null, activeWord: null });
  });

  it('clears on error', async () => {
    await playChapter(1);
    reportAt(1.5);

    await playFromVerse('9:9');

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', activeVerseId: null, activeWord: null });
  });

  it('clears when the reciter changes', async () => {
    seedHusary(executor);
    await playChapter(1);
    reportAt(1.5);

    setReciterId(31);
    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, activeVerseId: null, activeWord: null });
  });

  it('gives no highlight when the file timings overlap (invalid, so timingsFor returns none)', async () => {
    executor.run('UPDATE recitation_timings SET end_ms = 9000 WHERE audio_file_id = 100 AND verse_id = 1');
    await playChapter(1);

    reportAt(6);

    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null });
  });
});

describe('previous and next ayah', () => {
  beforeEach(() => {
    seedAyahs(executor);
    seedSurahTwoTimings(executor);
  });

  it('seeks to the previous ayah inside the surah', async () => {
    await playChapter(1);
    reportAt(12);

    await previousAyah();

    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(4.95);
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, positionMs: 4950 });
  });

  it('seeks to the next ayah inside the surah', async () => {
    await playChapter(1);
    reportAt(6);

    await nextAyah();

    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(10);
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, positionMs: 10000 });
  });

  it('from inside a gap, the next ayah is the one after the gap', async () => {
    await playChapter(1);
    reportAt(15.5);

    await nextAyah();

    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(16);
  });

  it('from the last ayah, next goes to the first ayah of the next surah', async () => {
    await playChapter(1);
    reportAt(18);

    await nextAyah();

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading' });
    expect(fakePlaylist().skipTo).toHaveBeenLastCalledWith(1);
    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('from the first ayah, previous goes to the last ayah of the previous surah', async () => {
    await playChapter(2);
    reportAt(0);

    await previousAyah();

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, status: 'loading' });
    expect(fakePlaylist().skipTo).toHaveBeenLastCalledWith(0);
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(16);
  });

  it('from the first ayah of the first surah, previous starts it again', async () => {
    await playChapter(1);
    reportAt(1);

    await previousAyah();

    expect(usePlayerStore.getState().chapterId).toBe(1);
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(0);
  });

  it('after the last ayah of the last surah, next stops', async () => {
    executor.run("INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (1140, 1, 0, 20000)");
    await playChapter(114);
    reportAt(5);

    await nextAyah();

    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('falls back to the surah moves when the surah has no timings', async () => {
    await playChapter(2);
    reportAt(3);
    expect(usePlayerStore.getState().chapterId).toBe(2);

    await nextAyah();
    expect(usePlayerStore.getState().chapterId).toBe(114);

    await previousAyah();
    expect(usePlayerStore.getState().chapterId).toBe(2);
  });
});

describe('volume', () => {
  it('applies the stored volume to a new playlist and follows later changes', async () => {
    usePlayerStore.getState().setVolume(0.5);
    await playChapter(1);
    expect(fakePlaylist().volume).toBe(0.5);

    usePlayerStore.getState().setVolume(0.2);
    expect(fakePlaylist().volume).toBe(0.2);
  });
});

describe('timings cache', () => {
  it('reads each audio file once, and reads the new reciter file after a reciter change', async () => {
    seedAyahs(executor);
    seedHusary(executor);
    const spy = jest.spyOn(timings, 'timingsFor');
    try {
      await playChapter(1);
      await nextSurah();
      await previousSurah();
      await playChapter(1);
      expect(spy.mock.calls.filter(([, id]) => id === 100)).toHaveLength(1);

      setReciterId(31);
      await playChapter(1);
      expect(spy.mock.calls.filter(([, id]) => id === 300)).toHaveLength(1);
      expect(spy.mock.calls.filter(([, id]) => id === 100)).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('resume from idle', () => {
  it('restores the saved session and plays it from the saved position', async () => {
    storage.set(storageKeys.audioLastPosition, JSON.stringify({ reciterId: 30, chapterId: 2, positionMs: 5000 }));

    await resume();

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, reciterId: 30 });
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(5);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('with nothing saved, plays the first surah with the current reciter', async () => {
    await resume();

    expect(audio.createAudioPlaylist).toHaveBeenCalledWith(expect.objectContaining({ sources: expect.arrayContaining([{ uri: 'https://example.test/1.mp3' }]) }));
    expect(fakePlaylist().skipTo).not.toHaveBeenCalled();
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, reciterId: 30, status: 'loading' });
  });

  it('while playing, does nothing', async () => {
    await playChapter(1);
    reportAt(1);
    const plays = fakePlaylist().play.mock.calls.length;
    const playlists = audio.createAudioPlaylist.mock.calls.length;

    await resume();

    expect(fakePlaylist().play).toHaveBeenCalledTimes(plays);
    expect(audio.createAudioPlaylist).toHaveBeenCalledTimes(playlists);
    expect(usePlayerStore.getState().status).toBe('playing');
  });
});

describe('repeat', () => {
  // Surah 1 timings: verse 1 0-5000, 2 5000-10000, 3 10000-15000, 4 16000-20000. Its end tolerance is 50 ms.
  beforeEach(() => {
    seedAyahs(executor);
    seedSurahTwoTimings(executor);
  });

  it('sets the range with done at 0, when its ayahs have timings', async () => {
    await playChapter(1);
    reportAt(1);

    expect(setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 })).toBe(true);
    expect(usePlayerStore.getState().repeat).toEqual({ fromVerseId: 2, toVerseId: 3, count: 3, done: 0 });
  });

  it('does nothing when the surah has no timings, or the range is not valid', async () => {
    await playChapter(114);

    expect(setRepeat({ fromVerseId: 1, toVerseId: 1, count: 3 })).toBe(false);
    expect(usePlayerStore.getState().repeat).toBeNull();

    await playChapter(1);
    expect(setRepeat({ fromVerseId: 3, toVerseId: 2, count: 3 })).toBe(false);
    expect(setRepeat({ fromVerseId: 2, toVerseId: 3, count: 2 })).toBe(false);
    expect(usePlayerStore.getState().repeat).toBeNull();
  });

  it('seeks back to the range start at the end of its last ayah, until the count is reached, then continues', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });

    reportAt(14.94);
    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();

    reportAt(14.95);
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(4.95);
    expect(usePlayerStore.getState()).toMatchObject({ positionMs: 4950, repeat: { done: 1 } });

    reportAt(5.1);
    reportAt(14.96);
    expect(fakePlaylist().seekTo).toHaveBeenCalledTimes(2);
    expect(usePlayerStore.getState().repeat).toMatchObject({ done: 2 });

    reportAt(5.1);
    reportAt(15.02);
    expect(fakePlaylist().seekTo).toHaveBeenCalledTimes(2);
    expect(usePlayerStore.getState().repeat).toBeNull();
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('plays the range once and continues for count 1', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 1 });

    reportAt(14.96);

    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ repeat: null, status: 'playing' });
  });

  it('repeats for ever with Infinity', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: Infinity });

    for (let loop = 0; loop < 20; loop += 1) {
      reportAt(5.1);
      reportAt(14.96);
    }

    expect(fakePlaylist().seekTo).toHaveBeenCalledTimes(20);
    expect(usePlayerStore.getState().repeat).not.toBeNull();
  });

  it('does not seek twice for stale ticks that arrive before the seek lands', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 5 });

    reportAt(14.96);
    reportAt(14.99);
    reportAt(14.97);

    expect(fakePlaylist().seekTo).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState().repeat).toMatchObject({ done: 1 });
  });

  it('repeats a single ayah from its own start', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 2, count: 3 });

    reportAt(9.96);

    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(4.95);
  });

  it('does nothing while the paused or stopped player reports a position', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });
    pause();

    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 14.96 });

    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
  });

  it('clears when the playlist moves to another surah', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });

    fakePlaylist().emitTrackChanged(1);

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, repeat: null });
  });

  it('clears on playChapter and playFromVerse', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });
    await playChapter(1);
    expect(usePlayerStore.getState().repeat).toBeNull();

    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });
    await playFromVerse('1:3');
    expect(usePlayerStore.getState().repeat).toBeNull();
  });

  it('clears when playback stops at the end of the last surah', async () => {
    await playChapter(114);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    usePlayerStore.getState().setRepeat({ fromVerseId: 1, toVerseId: 2, count: 3 });

    fakePlaylist().emitStatus({ didJustFinish: true });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', repeat: null });
  });

  it('clears when a seek lands outside the range, and keeps it for a seek inside', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });

    seek(7000);
    expect(usePlayerStore.getState().repeat).not.toBeNull();

    seek(2000);
    expect(usePlayerStore.getState().repeat).toBeNull();
  });

  it('keeps the range for the next ayah inside it, and clears when the next ayah is outside', async () => {
    await playChapter(1);
    reportAt(2);
    setRepeat({ fromVerseId: 1, toVerseId: 2, count: 3 });

    await nextAyah();
    expect(usePlayerStore.getState().repeat).not.toBeNull();

    fakePlaylist().currentTime = 6;
    await nextAyah();
    expect(usePlayerStore.getState().repeat).toBeNull();
  });

  it('clears when the previous ayah is outside the range', async () => {
    await playChapter(1);
    reportAt(6);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });

    await previousAyah();

    expect(usePlayerStore.getState().repeat).toBeNull();
  });

  it('clears when the next surah is played', async () => {
    await playChapter(1);
    reportAt(1);
    setRepeat({ fromVerseId: 2, toVerseId: 3, count: 3 });

    await nextSurah();

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, repeat: null });
  });
});

describe('recent listens', () => {
  const recent = () => listRecentListens(20, { db: mockUser.executor ?? undefined });

  it('saves the surah and its position on pause', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().currentTime = 12.5;

    pause();

    expect(recent()).toEqual([
      { audioFileId: 100, reciterResourceId: 30, chapterId: 1, lastPositionMs: 12500, playedAt: expect.any(Number) },
    ]);
  });

  it('saves the surah when the system pauses it (lock screen, headphones)', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 3 });

    expect(recent()).toMatchObject([{ audioFileId: 100, chapterId: 1, lastPositionMs: 3000 }]);
  });

  it('saves the surah that ended, at its final position, when the playlist moves on', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 0.1 });
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 45.9 });
    fakePlaylist().emitTrackChanged(1);

    expect(recent()).toMatchObject([{ audioFileId: 100, chapterId: 1, lastPositionMs: 45900 }]);
  });

  it('saves the surah it stops on, at the position it had reached', async () => {
    await playChapter(114);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    fakePlaylist().currentTime = 9;

    await nextSurah();

    expect(usePlayerStore.getState().status).toBe('idle');
    expect(recent()).toMatchObject([{ audioFileId: 1140, reciterResourceId: 30, chapterId: 114, lastPositionMs: 9000 }]);
  });

  it('saves on the status tick at most every 15 seconds for the same surah', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await playChapter(1);

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 1 });
    expect(recent()).toMatchObject([{ lastPositionMs: 1000 }]);

    now.mockReturnValue(1_005_000);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 6 });
    expect(recent()).toMatchObject([{ lastPositionMs: 1000 }]);

    now.mockReturnValue(1_015_000);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 16 });
    expect(recent()).toMatchObject([{ lastPositionMs: 16000, playedAt: 1_015_000 }]);
    now.mockRestore();
  });

  it('does not save while the surah is paused or stopped', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 5 });

    expect(recent()).toEqual([]);
  });

  it('keeps playback going when the write fails, and logs the error', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    const working = mockUser.executor;
    mockUser.executor = {
      exec: () => undefined,
      run: () => undefined,
      get: () => undefined,
      all: () => [],
      transaction: () => {
        throw new Error('disk full');
      },
    };

    expect(() => pause()).not.toThrow();

    expect(usePlayerStore.getState().status).toBe('paused');
    expect(warn).toHaveBeenCalledWith('Recent listen was not saved.', expect.any(Error));
    mockUser.executor = working;
    warn.mockRestore();
  });
});

describe('playing downloaded surahs', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const LOCAL_1 = 'file:///documents/audio/30/1.mp3';

  beforeEach(() => {
    resetFakeFileSystem();
  });

  function download(overrides: Partial<DownloadRow>): void {
    upsertDownload(
      {
        audioFileId: 100,
        reciterResourceId: 30,
        chapterId: 1,
        audioUrl: 'https://example.test/1.mp3',
        sourceSizeBytes: null,
        localPath: 'audio/30/1.mp3',
        sizeBytes: 5000,
        status: 'done',
        progress: 1,
        resumeData: null,
        downloadedAt: Date.now(),
        verifiedAt: Date.now(),
        ...overrides,
      },
      { db: mockUser.executor ?? undefined },
    );
  }

  function sourcesOfLastPlaylist(): { uri: string }[] {
    return (audio.createAudioPlaylist.mock.calls.at(-1)?.[0] as { sources: { uri: string }[] }).sources;
  }

  it('plays the local file of a surah verified within 7 days, and streams the other surahs', async () => {
    download({});
    putFile(LOCAL_1, 5000);

    await playChapter(1);

    expect(sourcesOfLastPlaylist()).toEqual([
      { uri: LOCAL_1 },
      { uri: 'https://example.test/2.mp3' },
      { uri: 'https://example.test/114.mp3' },
    ]);
  });

  it('streams a surah whose verification is older than 7 days', async () => {
    download({ verifiedAt: Date.now() - 8 * DAY });
    putFile(LOCAL_1, 5000);

    await playChapter(1);

    expect(sourcesOfLastPlaylist()[0]).toEqual({ uri: 'https://example.test/1.mp3' });
  });

  it('streams a surah whose file is no longer on disk', async () => {
    download({});

    await playChapter(1);

    expect(sourcesOfLastPlaylist()[0]).toEqual({ uri: 'https://example.test/1.mp3' });
  });

  it('streams a surah that is still downloading', async () => {
    download({ status: 'downloading', verifiedAt: null });
    putFile(LOCAL_1, 5000);

    await playChapter(1);

    expect(sourcesOfLastPlaylist()[0]).toEqual({ uri: 'https://example.test/1.mp3' });
  });
});

describe('offline gate', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const LOCAL_1 = 'file:///documents/audio/30/1.mp3';
  const ONLINE = { isConnected: true, isInternetReachable: true, type: 'WIFI' } as Awaited<ReturnType<typeof getNetworkStateAsync>>;
  const OFFLINE = { isConnected: false, isInternetReachable: false, type: 'NONE' } as Awaited<ReturnType<typeof getNetworkStateAsync>>;

  /** Makes the next network read answer, then waits for it, so the gate sees that state. */
  async function network(state: Awaited<ReturnType<typeof getNetworkStateAsync>>): Promise<void> {
    jest.mocked(getNetworkStateAsync).mockResolvedValueOnce(state);
    resetNetworkStateForTests();
    startNetworkWatch();
    await flush();
    if (state.isConnected === false || state.isInternetReachable === false) {
      useNetworkStatus.setState({
        online: false,
        changedAt: Date.now() - ONLINE_DEBOUNCE_MS,
      });
    }
  }

  function download(overrides: Partial<DownloadRow>): void {
    upsertDownload(
      {
        audioFileId: 100,
        reciterResourceId: 30,
        chapterId: 1,
        audioUrl: 'https://example.test/1.mp3',
        sourceSizeBytes: null,
        localPath: 'audio/30/1.mp3',
        sizeBytes: 5000,
        status: 'done',
        progress: 1,
        resumeData: null,
        downloadedAt: Date.now(),
        verifiedAt: Date.now(),
        ...overrides,
      },
      { db: mockUser.executor ?? undefined },
    );
  }

  beforeEach(() => {
    resetFakeFileSystem();
    resetNetworkStateForTests();
  });

  afterEach(() => {
    resetNetworkStateForTests();
  });

  it('does not try the stream for a surah that is not downloaded, and says so at once', async () => {
    await network(OFFLINE);

    await playChapter(2);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'offline' });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('gives the same offline message from an ayah', async () => {
    await network(OFFLINE);

    await playFromVerse('2:1');

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'offline' });
  });

  it('plays a surah downloaded and verified within 7 days while offline, from its local file', async () => {
    download({});
    putFile(LOCAL_1, 5000);
    await network(OFFLINE);

    await playChapter(1);

    expect(usePlayerStore.getState().error).toBeNull();
    expect(audio.createAudioPlaylist.mock.calls.at(-1)?.[0].sources[0]).toEqual({ uri: LOCAL_1 });
  });

  it('asks for one connection to verify a download older than 7 days, while offline', async () => {
    download({ verifiedAt: Date.now() - 8 * DAY });
    putFile(LOCAL_1, 5000);
    await network(OFFLINE);

    await playChapter(1);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'verify-required' });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('streams a surah older than 7 days while online, as before', async () => {
    download({ verifiedAt: Date.now() - 8 * DAY });
    putFile(LOCAL_1, 5000);
    await network(ONLINE);

    await playChapter(1);

    expect(usePlayerStore.getState().error).toBeNull();
    expect(audio.createAudioPlaylist.mock.calls.at(-1)?.[0].sources[0]).toEqual({ uri: 'https://example.test/1.mp3' });
  });

  it('says offline, not a generic load failure, when the network drops while a stream waits to load', async () => {
    await network(ONLINE);
    jest.useFakeTimers();
    try {
      await playChapter(2);
      expect(usePlayerStore.getState().status).toBe('loading');

      useNetworkStatus.setState({ online: false, changedAt: Date.now() - ONLINE_DEBOUNCE_MS });
      jest.advanceTimersByTime(10_000);

      expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'offline' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('playCommand (ADR 0037)', () => {
  it('increments on playChapter, playFromVerse and resume, not on pause, seek or nextAyah', async () => {
    const command = () => usePlayerStore.getState().playCommand;

    await playChapter(1);
    await flush();
    expect(command()).toBe(1);

    await playFromVerse('1:7');
    await flush();
    expect(command()).toBe(2);

    fakePlaylist().emitStatus({ playing: true, isLoaded: true });
    pause();
    expect(command()).toBe(2);

    await resume();
    await flush();
    expect(command()).toBe(3);

    seek(1000);
    expect(command()).toBe(3);

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 1 });
    await nextAyah();
    await flush();
    expect(command()).toBe(3);
  });
});

describe('jumping to an ayah while another is playing (seek still pending)', () => {
  beforeEach(() => {
    seedAyahs(executor);
    seedSurahTwoTimings(executor);
  });

  /** Plays surah 1 inside ayah 1, pauses it, then starts a jump to ayah 3 whose seek stays pending until resolved. */
  async function jumpToAyahThreePendingSeek(): Promise<{ jump: Promise<void>; landSeek: () => void }> {
    await playChapter(1);
    heardAt(1.5);
    pause();

    let landSeek: () => void = () => undefined;
    fakePlaylist().seekTo.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          landSeek = resolve;
        }),
    );
    const jump = playFromVerse('1:3');
    await flush();
    return { jump, landSeek: () => landSeek() };
  }

  it('keeps the requested ayah active while the seek is pending, ignoring the old position', async () => {
    const { jump, landSeek } = await jumpToAyahThreePendingSeek();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', chapterId: 1, activeVerseId: 3 });

    // The paused playlist still reports its old position, inside ayah 1, until the seek lands.
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 1.5 });
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', activeVerseId: 3 });

    landSeek();
    await jump;
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(10);
  });

  it('marks playing and follows the new position once the seek has landed and playback starts', async () => {
    const { jump, landSeek } = await jumpToAyahThreePendingSeek();
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 1.5 });

    landSeek();
    await jump;
    expect(fakePlaylist().play).toHaveBeenCalled();

    heardAt(10.5);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', activeVerseId: 3 });
    heardAt(17);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', activeVerseId: 4 });
  });

  it('keeps the requested ayah when a playing tick at the old position arrives before a jump to another surah lands', async () => {
    await playChapter(2);
    reportAt(1);
    let landSeek: () => void = () => undefined;
    fakePlaylist().seekTo.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          landSeek = resolve;
        }),
    );
    const jump = playFromVerse('1:3');
    await flush();
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, activeVerseId: 3 });

    // Surah 2 is still playing at 1 s, which is inside surah 1's ayah 1, while the seek to ayah 3 is pending.
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 1 });
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3 });

    landSeek();
    await jump;
  });

  it('keeps the requested ayah when a paused track on the new surah reports the old position before it plays', async () => {
    await playChapter(2);
    reportAt(12);

    // 1:1 starts at 0, so there is no seek: the playlist only moves to surah 1 and reports the old track's time.
    await playFromVerse('1:1');
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 1, status: 'loading', activeVerseId: 1 });
    // 12 s on surah 1 is ayah 3, so a tick at the old time would move the highlight there.
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, currentTime: 12 });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', activeVerseId: 1 });
  });

  it('keeps the requested ayah for the first ticks after the seek lands, even when they report just before its start', async () => {
    // 1:3 starts at 10 s. The first ticks after the seek report about that position, which the highlight lag puts in ayah 2.
    await playFromVerse('1:3');
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(10);

    reportAt(10);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', activeVerseId: 3 });
    reportAt(10.05);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3 });
    reportAt(9.97);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3 });

    // Two seconds on, the highlight follows the timings again.
    reportAt(12);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3 });
    reportAt(17);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 4 });
  });

  it('keeps the requested ayah when the track change arrives after the load has set it', async () => {
    await playChapter(1);
    heardAt(1.5);
    pause();

    // The native playlist moves on its own time: the skip does not emit trackChanged at once.
    fakePlaylist().skipTo.mockImplementationOnce(() => undefined);
    await playFromVerse('2:1');
    await flush();
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, activeVerseId: 8 });

    fakePlaylist().emitTrackChanged(1);

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading', activeVerseId: 8 });
  });

  it('keeps the requested ayah while ticks are in the gap before its start, and follows the timings after it', async () => {
    // 1:3 starts at 10 s, but its first word starts at 9.6 s. The seek goes to the word, so the ticks after it
    // report times in the gap that the timings put in ayah 2.
    executor.run(`UPDATE recitation_timings SET segments = '[[1,9600,10500],[2,10500,12000]]' WHERE audio_file_id = 100 AND verse_id = 3`);
    await playFromVerse('1:3');
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(9.6);

    for (const seconds of [9.6, 9.8, 10, 10.05]) {
      reportAt(seconds);
      expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', activeVerseId: 3 });
    }

    reportAt(10.2);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 3 });
    reportAt(16.5);
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: 4 });
  });
});

describe('a surah the reciter has no file for (ADR 0062)', () => {
  beforeEach(() => {
    executor.run('DELETE FROM chapter_audio_files WHERE chapter_id = 2');
  });

  it('playFromVerse on a surah with no file marks it unavailable and starts nothing', async () => {
    await playFromVerse('2:1');

    expect(usePlayerStore.getState()).toMatchObject({
      status: 'error',
      error: 'surah-unavailable',
      unavailable: { reciterId: 30, chapterId: 2 },
    });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('loadChapter does the same', async () => {
    await playChapter(2);

    expect(usePlayerStore.getState()).toMatchObject({
      status: 'error',
      error: 'surah-unavailable',
      unavailable: { reciterId: 30, chapterId: 2 },
    });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('a later play clears it', async () => {
    await playChapter(2);
    expect(usePlayerStore.getState().unavailable).not.toBeNull();

    await playChapter(1);

    expect(usePlayerStore.getState().unavailable).toBeNull();
    expect(usePlayerStore.getState().status).not.toBe('error');
  });

  it('a surah that is missing from the pack does not change the one playing before', async () => {
    await playChapter(1);
    const playing = fakePlaylist();
    expect(usePlayerStore.getState().chapterId).toBe(1);

    await playFromVerse('2:1');

    expect(usePlayerStore.getState().unavailable).toEqual({ reciterId: 30, chapterId: 2 });
    expect(fakePlaylist()).toBe(playing);
  });
});

/**
 * Surahs 36, 37, 39, 42 and 43 are available for the reciter; the others (38, 40, 41) are not. The playlist is
 * therefore 1, 2, 36, 37, 39, 42, 43, 114 (indices 0 to 7). Surah 37 has one timed ayah, for the next-ayah case.
 */
function seedSkipFixture(db: SqlExecutor): void {
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (36, 'سورة نموذج ستة وثلاثون', 'Sample 36', 'Sample 36', 'makkah', 1, 1, 0, 1, 1),
     (37, 'سورة نموذج سبعة وثلاثون', 'Sample 37', 'Sample 37', 'makkah', 1, 1, 0, 1, 1),
     (39, 'سورة نموذج تسعة وثلاثون', 'Sample 39', 'Sample 39', 'makkah', 1, 1, 0, 1, 1),
     (42, 'سورة نموذج اثنان وأربعون', 'Sample 42', 'Sample 42', 'makkah', 1, 1, 0, 1, 1),
     (43, 'سورة نموذج ثلاثة وأربعون', 'Sample 43', 'Sample 43', 'makkah', 1, 1, 0, 1, 1)`,
  );
  db.run(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search) VALUES
     (3701, '37:1', 37, 1, 1, 1, 1, 1, 'none', 'a', 'a')`,
  );
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (3600, 1, 36, 'https://example.test/36.mp3', 60000, 'mp3'),
     (3700, 1, 37, 'https://example.test/37.mp3', 60000, 'mp3'),
     (3900, 1, 39, 'https://example.test/39.mp3', 60000, 'mp3'),
     (4200, 1, 42, 'https://example.test/42.mp3', 60000, 'mp3'),
     (4300, 1, 43, 'https://example.test/43.mp3', 60000, 'mp3')`,
  );
  db.run(`INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (3700, 3701, 0, 6000)`);
}

/** Every notice the store shows, in order: a new notice object is one show. */
function recordShows(): { shows: SkipNotice[]; stop: () => void } {
  const shows: SkipNotice[] = [];
  const stop = useSkipNoticeStore.subscribe((state, previous) => {
    if (state.notice !== null && state.notice !== previous.notice) {
      shows.push(state.notice);
    }
  });
  return { shows, stop };
}

describe('continuous play over a surah the reciter lacks (ADR 0062)', () => {
  let recorder: { shows: SkipNotice[]; stop: () => void };

  beforeEach(() => {
    seedSkipFixture(executor);
    recorder = recordShows();
  });

  afterEach(() => {
    recorder.stop();
  });

  it('raises a notice when the playlist advances over a missing surah (37 to 39)', async () => {
    await playChapter(37);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });

    fakePlaylist().emitTrackChanged(4);

    expect(useSkipNoticeStore.getState().notice).toMatchObject({ reciterId: 30, chapterIds: [38] });
    expect(recorder.shows).toHaveLength(1);
  });

  it('raises no notice for an adjacent advance (36 to 37)', async () => {
    await playChapter(36);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });

    fakePlaylist().emitTrackChanged(3);

    expect(useSkipNoticeStore.getState().notice).toBeNull();
    expect(recorder.shows).toHaveLength(0);
  });

  it('raises no notice when the user loads a chosen surah across a gap', async () => {
    await playChapter(37);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });

    await playChapter(39);

    expect(fakePlaylist().skipTo).toHaveBeenLastCalledWith(4);
    expect(recorder.shows).toHaveLength(0);
  });

  it('nextSurah over a gap raises a notice', async () => {
    await playChapter(37);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });

    await nextSurah();

    expect(fakePlaylist().next).toHaveBeenCalled();
    expect(useSkipNoticeStore.getState().notice).toMatchObject({ chapterIds: [38] });
    expect(recorder.shows).toHaveLength(1);
  });

  it('nextAyah from the last ayah over a gap raises one notice, and moves by skipTo', async () => {
    await playChapter(37);
    reportAt(3);

    await nextAyah();

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 39, status: 'loading' });
    expect(fakePlaylist().skipTo).toHaveBeenLastCalledWith(4);
    expect(fakePlaylist().next).not.toHaveBeenCalled();
    expect(recorder.shows).toHaveLength(1);
    expect(recorder.shows[0]).toMatchObject({ chapterIds: [38] });
  });

  it('two consecutive missing surahs raise one notice with both ids', async () => {
    await playChapter(39);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });

    fakePlaylist().emitTrackChanged(5);

    expect(recorder.shows).toHaveLength(1);
    expect(recorder.shows[0]).toMatchObject({ chapterIds: [40, 41] });
  });

  it('the last available surah ending stops playback with no notice', async () => {
    await playChapter(114);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true });

    fakePlaylist().emitStatus({ didJustFinish: true });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle' });
    expect(useSkipNoticeStore.getState().notice).toBeNull();
    expect(recorder.shows).toHaveLength(0);
  });

  it('a new load clears the notice', async () => {
    await playChapter(37);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });
    await nextSurah();
    expect(useSkipNoticeStore.getState().notice).not.toBeNull();

    await playChapter(36);

    expect(useSkipNoticeStore.getState().notice).toBeNull();
  });

  it('a failure clears the notice', async () => {
    await playChapter(37);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 60 });
    await nextSurah();

    usePlayerStore.getState().markFailed('load-failed');

    expect(useSkipNoticeStore.getState().notice).toBeNull();
  });
});

/**
 * Husary (31) as a second reciter for the switch tests: installed with surah 1. With `timings`, surah 1's ayahs start at
 * 2 s (1:1) and 20 s (1:7), so a switch from 1:7 lands at 20 s with this reciter and at 40 s with Mishari (30).
 */
function seedSecondReciter(db: SqlExecutor, { timings }: { timings: boolean }): void {
  seedHusary(db);
  if (timings) {
    db.run(
      `INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES
       (300, 1, 2000, 9000),
       (300, 7, 20000, 46000)`,
    );
  }
}

/**
 * Husary (32) with surahs 1 and 2, so a switch from Mishari's surah 2 lands on a playlist whose index for surah 2 is 1:
 * the playlist moves there itself (skipTo), and the carried repeat must survive that track change.
 */
function seedReciterWithSurahTwo(db: SqlExecutor): void {
  db.run(
    `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
     (32, 'chapter_recitations', 'Minshawi', 'المنشاوي', 1, 2000, 0)`,
  );
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (32, 'chapter_recitations', 1, 'c', 0, 'Minshawi', 'المنشاوي')`,
  );
  db.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES (3, 32, 'Minshawi', 'المنشاوي', 0)`);
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (301, 3, 1, 'https://example.test/minshawi-1.mp3', 46000, 'mp3'),
     (302, 3, 2, 'https://example.test/minshawi-2.mp3', 286000, 'mp3')`,
  );
  db.run(`INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (302, 8, 0, 286000)`);
}

/** Mishari's surah 2 timings: its one ayah (2:1, verse 8) across the whole file. */
function seedMishariSurahTwoTimings(db: SqlExecutor): void {
  db.run(`INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (200, 8, 0, 286000)`);
}

/** Plays `verseKey` with Mishari (30) and leaves it playing, as a load the user started would. */
async function playingWithMishari(verseKey: string): Promise<void> {
  await playFromVerse(verseKey);
  fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 0.1, duration: 46.49 });
}

describe('switching reciter while a surah plays (ADR 0062 decision 6)', () => {
  it('switchReciter while playing loads the new reciter at the start of the current ayah and keeps playing', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');
    await playingWithMishari('1:7');
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(40);

    const outcome = await switchReciter(31);

    expect(outcome).toBe('switched');
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, chapterId: 1, status: 'loading', activeVerseId: 7 });
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 20.1, duration: 46 });
    expect(usePlayerStore.getState().status).toBe('playing');
  });

  it('switchReciter while paused loads nothing, stays paused at the new ayah start, and resume plays the new reciter', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');
    await playingWithMishari('1:7');
    pause();
    const playlistsBefore = audio.createAudioPlaylist.mock.calls.length;

    const outcome = await switchReciter(31);

    expect(outcome).toBe('switched');
    expect(audio.createAudioPlaylist.mock.calls.length).toBe(playlistsBefore);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'paused', reciterId: 31, chapterId: 1, positionMs: 20000, activeVerseId: 7 });

    await resume();

    expect(audio.createAudioPlaylist.mock.calls.length).toBe(playlistsBefore + 1);
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, chapterId: 1 });
  });

  it('switchReciter carries the repeat range to the new reciter and restarts its count', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('1:1');
    expect(setRepeat({ fromVerseId: 1, toVerseId: 7, count: 3 })).toBe(true);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 4, duration: 46 });

    await switchReciter(31);

    expect(usePlayerStore.getState().repeat).toEqual({ fromVerseId: 1, toVerseId: 7, count: 3, done: 0 });
  });

  it('switchReciter drops the repeat when the new reciter has no valid timings, and starts the surah from the beginning', async () => {
    seedSecondReciter(executor, { timings: false });
    storage.set(storageKeys.readerLastVerseKey, '1:7');
    await playingWithMishari('1:7');
    expect(setRepeat({ fromVerseId: 1, toVerseId: 7, count: 3 })).toBe(true);

    const outcome = await switchReciter(31);

    expect(outcome).toBe('switched');
    expect(usePlayerStore.getState().repeat).toBeNull();
    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, positionMs: 0 });
  });

  it('switchReciter keeps the carried repeat when the playlist moves to that surah itself (a track change of ours)', async () => {
    seedReciterWithSurahTwo(executor);
    // Mishari's surah 2 has one ayah with timings, so the repeat can be set on it.
    seedMishariSurahTwoTimings(executor);
    storage.set(storageKeys.readerLastVerseKey, '2:1');
    await playFromVerse('2:1');
    // Surah 2 is 286 s long: a 46 s report would make its timings not fit the audio (ADR 0052) and drop them.
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 0.1, duration: 286 });
    expect(setRepeat({ fromVerseId: 8, toVerseId: 8, count: 3 })).toBe(true);

    const outcome = await switchReciter(32);

    expect(outcome).toBe('switched');
    expect(fakePlaylist().skipTo).toHaveBeenCalledWith(1);
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 32, chapterId: 2 });
    expect(usePlayerStore.getState().repeat).toEqual({ fromVerseId: 8, toVerseId: 8, count: 3, done: 0 });
  });

  it('switchReciter with autoplay plays even when it was paused', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');
    await playingWithMishari('1:7');
    pause();

    const outcome = await switchReciter(31, { autoplay: true });

    expect(outcome).toBe('switched');
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, chapterId: 1 });
  });

  it('switchReciter while playing with a reciter that lacks the surah stops the audio and shows the unavailable state', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('2:1');
    const playlist = fakePlaylist();

    const outcome = await switchReciter(31);

    expect(outcome).toBe('unavailable');
    expect(playlist.pause).toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({
      status: 'error',
      error: 'surah-unavailable',
      unavailable: { reciterId: 31, chapterId: 2 },
    });
  });

  it('switchReciter while paused with a reciter that lacks the surah changes nothing in the store but the saved choice', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('2:1');
    pause();
    const before = usePlayerStore.getState();

    const outcome = await switchReciter(31);

    expect(outcome).toBe('none');
    expect(getReciterId()).toBe(31);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'paused', reciterId: before.reciterId, unavailable: null });
  });

  it('switchReciter returns none and only saves the choice when nothing is loaded', async () => {
    seedSecondReciter(executor, { timings: true });

    expect(await switchReciter(31)).toBe('none');

    expect(getReciterId()).toBe(31);
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', reciterId: null });
  });

  it('switchReciter after a stop saves the choice and starts nothing', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('1:7');
    usePlayerStore.getState().markStopped();
    const playlistsBefore = audio.createAudioPlaylist.mock.calls.length;

    expect(await switchReciter(31)).toBe('none');

    expect(getReciterId()).toBe(31);
    expect(audio.createAudioPlaylist.mock.calls.length).toBe(playlistsBefore);
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('a switch while playing does not restore a repeat that the new surah cannot hold', async () => {
    seedSecondReciter(executor, { timings: false });
    await playingWithMishari('1:1');
    setRepeat({ fromVerseId: 1, toVerseId: 7, count: 3 });

    await switchReciter(31);

    expect(usePlayerStore.getState().repeat).toBeNull();
  });
});

describe('resume follows the selected reciter (ADR 0062 decision 7)', () => {
  it('resume of a paused track by a different reciter than the selected one switches to the selected reciter at the same ayah and plays', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');
    await playingWithMishari('1:7');
    pause();
    setReciterId(31);

    await resume();

    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 31, chapterId: 1 });
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
    expect(fakePlaylist().play).toHaveBeenCalled();
  });

  it('resume with agreeing reciters is unchanged: the loaded playlist is reused', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('1:7');
    pause();
    const playlistsBefore = audio.createAudioPlaylist.mock.calls.length;

    await resume();

    expect(audio.createAudioPlaylist.mock.calls.length).toBe(playlistsBefore);
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 30, status: 'playing' });
  });

  it('resume switch to a reciter that lacks the surah ends in the unavailable state', async () => {
    seedSecondReciter(executor, { timings: true });
    await playingWithMishari('2:1');
    pause();
    setReciterId(31);

    await resume();

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'surah-unavailable', unavailable: { reciterId: 31, chapterId: 2 } });
  });
});

describe('every play entry point starts at the current ayah (ADR 0062 decision 7b)', () => {
  it('playReciter starts the current ayah with its timing, not the surah start', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');

    await playReciter(31, true);

    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
  });

  it('playVerse (the reader and the mini player) starts the current ayah with its timing', async () => {
    seedSecondReciter(executor, { timings: true });
    setReciterId(31);

    await playVerse('1:7');

    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
  });

  it('playSurahFromReciter starts the current ayah when it is in that surah', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '1:7');

    await playSurahFromReciter(31, 1);

    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(20);
  });

  it('playSurahFromReciter plays the surah start when the current ayah is in another surah', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '2:1');

    await playSurahFromReciter(30, 1);

    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 30, chapterId: 1, positionMs: 0 });
  });

  it('a reciter with no usable timings starts the surah from the beginning', async () => {
    seedSecondReciter(executor, { timings: false });
    storage.set(storageKeys.readerLastVerseKey, '1:7');

    await playReciter(31, true);

    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', reciterId: 31, positionMs: 0 });
  });

  it('a reciter that lacks the surah shows the unavailable state from the reciter entry point', async () => {
    seedSecondReciter(executor, { timings: true });
    storage.set(storageKeys.readerLastVerseKey, '2:1');

    await playReciter(31, true);

    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'surah-unavailable', unavailable: { reciterId: 31, chapterId: 2 } });
  });
});


describe('a resume position plays muted before its seek (Android foreground-service rule)', () => {
  // The playlist is built by the first load, so prime one (a paused load of surah 2 at 0) before holding any seek.
  beforeEach(async () => {
    await playChapter(2, 0);
    pause();
    fakePlaylist().play.mockClear();
    fakePlaylist().seekTo.mockClear();
  });

  /** Holds the next seek open. `land` resolves it, `fail` rejects it. */
  function holdNextSeek(): { land: () => void; fail: (error: Error) => void } {
    let land: () => void = () => undefined;
    let fail: (error: Error) => void = () => undefined;
    fakePlaylist().seekTo.mockImplementationOnce(
      () =>
        new Promise<void>((resolve, reject) => {
          land = resolve;
          fail = reject;
        }),
    );
    return { land: () => land(), fail: (error) => fail(error) };
  }

  it('plays before the seek lands, muted, and unmutes once the seek resolves', async () => {
    const seek = holdNextSeek();
    const load = playChapter(1, 5000);
    await flush();

    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(5);
    expect(fakePlaylist().play).toHaveBeenCalledTimes(1);
    expect(fakePlaylist().muted).toBe(true);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading', chapterId: 1 });

    seek.land();
    await load;
    expect(fakePlaylist().muted).toBe(false);
    // The play that starts the surah after the seek is as before, so play runs twice in all.
    expect(fakePlaylist().play).toHaveBeenCalledTimes(2);
    expect(fakePlaylist().play.mock.invocationCallOrder[0]).toBeLessThan(fakePlaylist().seekTo.mock.invocationCallOrder[0]!);
  });

  it('a load at position 0 is not muted and does not pre-play', async () => {
    await playChapter(1, 0);

    expect(fakePlaylist().muted).toBe(false);
    expect(fakePlaylist().play).toHaveBeenCalledTimes(1);
    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
  });

  it('a load superseded during its seek does not unmute or override the newer load', async () => {
    const seek = holdNextSeek();
    const first = playChapter(1, 5000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);

    // A newer load at position 0 starts from the start: it sets muted itself, and the superseded seek must not touch it.
    await playChapter(2, 0);
    expect(fakePlaylist().muted).toBe(false);

    seek.land();
    await first;
    expect(fakePlaylist().muted).toBe(false);
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2 });
  });

  it('a newer load at a resume position keeps itself muted when an older seek lands', async () => {
    const older = holdNextSeek();
    const first = playChapter(1, 5000);
    await flush();

    const newer = holdNextSeek();
    const second = playChapter(2, 7000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);

    older.land();
    await first;
    expect(fakePlaylist().muted).toBe(true);

    newer.land();
    await second;
    expect(fakePlaylist().muted).toBe(false);
  });

  it('a load that fails before it plays stops an older muted pre-play', async () => {
    const seek = holdNextSeek();
    const first = playChapter(1, 5000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);
    fakePlaylist().pause.mockClear();

    // Surah 115 does not exist, so this load fails at once. The older pre-play must not keep playing silently.
    await playChapter(115, 0);
    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(fakePlaylist().muted).toBe(false);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error' });

    seek.land();
    await first;
    expect(fakePlaylist().muted).toBe(false);
  });

  it('a seek that rejects unmutes and reports the load as failed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seek = holdNextSeek();
    const load = playChapter(1, 5000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);

    seek.fail(new Error('seek refused'));
    await load;

    expect(fakePlaylist().muted).toBe(false);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'load-failed' });
    warn.mockRestore();
  });

  it('pausing during the pre-play unmutes, so a later resume is heard', async () => {
    const seek = holdNextSeek();
    const load = playChapter(1, 5000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);

    pause();
    expect(fakePlaylist().muted).toBe(false);
    expect(usePlayerStore.getState().status).toBe('paused');

    seek.land();
    await load;
    expect(fakePlaylist().muted).toBe(false);
  });

  it('stopping during the pre-play unmutes the playlist', async () => {
    // Surah 114 is the last of the playlist, so next surah stops there.
    const seek = holdNextSeek();
    const load = playChapter(114, 5000);
    await flush();
    expect(fakePlaylist().muted).toBe(true);

    nextSurah();
    expect(usePlayerStore.getState().status).toBe('idle');
    expect(fakePlaylist().muted).toBe(false);

    seek.land();
    await load;
    expect(fakePlaylist().muted).toBe(false);
  });

  it('while the seek is pending, a playing tick at the old position does not mark playing or save a listen', async () => {
    const seek = holdNextSeek();
    const load = playChapter(1, 5000);
    await flush();

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, currentTime: 0 });
    expect(usePlayerStore.getState()).toMatchObject({ status: 'loading' });
    expect(listRecentListens(20, { db: mockUser.executor ?? undefined }).filter((row) => row.chapterId === 1)).toEqual([]);

    seek.land();
    await load;
    // The seek has landed: the next playing tick at the new position marks the surah playing and saves its listen.
    reportAt(5);
    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing' });
    expect(listRecentListens(20, { db: mockUser.executor ?? undefined }).filter((row) => row.chapterId === 1)).toMatchObject([
      { chapterId: 1, lastPositionMs: 5000 },
    ]);
  });
});
