import type { SqlExecutor } from '@/core/db/sql-executor';
import { ONLINE_DEBOUNCE_MS, resetNetworkStateForTests, useNetworkStatus } from '@/core/network/network-state';
import { storage, storageKeys } from '@/core/storage/mmkv';

import type { FakeAudioPlaylist } from '../../../jest/fake-audio-player';
import { openUserTestStore } from '../../../jest/user-test-db';
import { openAudioTestDb } from './data/test-db';
import { listRecentListens } from './data/recent-listens';
import { nextAyah, pause, playChapter, playFromVerse, playVerseRange, resetPlayerForTests, resume, seek, setRepeat, switchReciter } from './player';
import { usePlayerStore } from './playerStore';
import { setReciterId } from './settings';

// A dua's verse range (ADR 0092 decision 3). Fixture text only: the verse texts are placeholders, not Quran.

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

type AudioModuleMock = { createAudioPlaylist: jest.Mock };

const audio = jest.requireMock<AudioModuleMock>('expo-audio');
let executor: SqlExecutor;
let close: () => void;
let userDatabase: { close: () => void };

function fakePlaylist(): FakeAudioPlaylist {
  const value = audio.createAudioPlaylist.mock.results.at(-1)?.value as FakeAudioPlaylist | undefined;
  if (value === undefined) {
    throw new Error('No playlist was created.');
  }
  return value;
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Reciter 30 (id 1): surah 1 whole (2 ayahs, file 100, 10 s), surah 2 partial (records 2 to 4, file 200, 15 s), surah 3
 * whole (1 ayah, 5 s), surah 4 partial (records 1 to 3, file 400). Reciter 31 (id 2): surah 2 whole (file 500, 25 s).
 */
function seed(db: SqlExecutor): void {
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opening', 'makkah', 5, 2, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 5, 1, 2, 49),
     (3, 'آل عمران', 'Ali', 'Family', 'madinah', 89, 1, 1, 50, 76),
     (4, 'النساء', 'An-Nisa', 'Women', 'madinah', 92, 5, 1, 77, 106)`,
  );
  db.run(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search) VALUES
     (1, '1:1', 1, 1, 1, 1, 1, 1, 'none', 'a', 'a'),
     (2, '1:2', 1, 2, 1, 1, 1, 1, 'none', 'a', 'a'),
     (8, '2:1', 2, 1, 1, 1, 1, 2, 'none', 'a', 'a'),
     (9, '2:2', 2, 2, 1, 1, 1, 2, 'none', 'a', 'a'),
     (10, '2:3', 2, 3, 1, 1, 1, 2, 'none', 'a', 'a'),
     (11, '2:4', 2, 4, 1, 1, 1, 2, 'none', 'a', 'a'),
     (12, '2:5', 2, 5, 1, 1, 1, 2, 'none', 'a', 'a'),
     (13, '3:1', 3, 1, 1, 1, 1, 3, 'none', 'a', 'a'),
     (14, '4:1', 4, 1, 1, 1, 1, 4, 'none', 'a', 'a'),
     (15, '4:2', 4, 2, 1, 1, 1, 4, 'none', 'a', 'a'),
     (16, '4:3', 4, 3, 1, 1, 1, 4, 'none', 'a', 'a'),
     (17, '4:4', 4, 4, 1, 1, 1, 4, 'none', 'a', 'a'),
     (18, '4:5', 4, 5, 1, 1, 1, 4, 'none', 'a', 'a')`,
  );
  for (const [id, name] of [
    [30, 'Mishari'],
    [31, 'Husary'],
  ] as const) {
    db.run(`INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes) VALUES (${id}, 'chapter_recitations', '${name}', 'قارئ', 1, 1000)`);
    db.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES (${id}, 'chapter_recitations', 1, 'a', 0, '${name}', 'قارئ')`);
  }
  db.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES (1, 30, 'Mishari', 'قارئ', 1), (2, 31, 'Husary', 'قارئ', 1)`);
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format, first_ayah, last_ayah) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 10000, 'mp3', NULL, NULL),
     (200, 1, 2, 'https://example.test/2.mp3', 15000, 'mp3', 2, 4),
     (300, 1, 3, 'https://example.test/3.mp3', 5000, 'mp3', NULL, NULL),
     (400, 1, 4, 'https://example.test/4.mp3', 15000, 'mp3', 1, 3),
     (500, 2, 2, 'https://example.test/h2.mp3', 25000, 'mp3', NULL, NULL)`,
  );
  db.run(
    `INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES
     (100, 1, 0, 5000), (100, 2, 5000, 10000),
     (200, 9, 0, 5000), (200, 10, 5000, 10000), (200, 11, 10000, 15000),
     (300, 13, 0, 5000),
     (400, 14, 0, 5000), (400, 15, 5000, 10000), (400, 16, 10000, 15000),
     (500, 8, 0, 5000), (500, 9, 5000, 10000), (500, 10, 10000, 15000), (500, 11, 15000, 20000), (500, 12, 20000, 25000)`,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetPlayerForTests();
  storage.remove(storageKeys.audioLastPosition);
  ({ executor, close } = openAudioTestDb());
  seed(executor);
  mockContent.executor = executor;
  const user = openUserTestStore();
  mockUser.executor = user.store.db ?? null;
  userDatabase = user.database;
  setReciterId(30);
});

afterEach(() => {
  resetPlayerForTests();
  resetNetworkStateForTests();
  close();
  userDatabase.close();
  mockContent.executor = null;
  mockUser.executor = null;
});

const state = () => usePlayerStore.getState();
const RANGE_2_2_TO_2_3 = { chapterId: 2, fromVerseId: 9, toVerseId: 10 };

/** Plays 2:2 to 2:3 and lets its load finish, so the playlist is playing the surah. */
async function playRangeTwoTwoToThree(): Promise<void> {
  await playVerseRange('2:2', '2:3');
  fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 0 });
}

describe('starting a verse range', () => {
  it('plays from the first ayah and records the range', async () => {
    await playVerseRange('2:2', '2:3');

    expect(state()).toMatchObject({ chapterId: 2, status: 'loading', rangePlay: RANGE_2_2_TO_2_3 });
    expect(fakePlaylist().skipTo).toHaveBeenCalledWith(1);
  });

  it('highlights the ayahs of the range from their timings', async () => {
    await playRangeTwoTwoToThree();

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 5.5 });

    expect(state().activeVerseId).toBe(10);
  });

  it('keeps the range when the file has timings for both ends', async () => {
    await playVerseRange('1:1', '1:2');

    expect(state().rangePlay).toEqual({ chapterId: 1, fromVerseId: 1, toVerseId: 2 });
  });
});

describe('ending a verse range', () => {
  it('stops at the end of its last ayah, and does not load the next surah', async () => {
    await playRangeTwoTwoToThree();
    const playlists = audio.createAudioPlaylist.mock.calls.length;

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 9.5 });
    expect(state().status).toBe('playing');

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 10.2 });

    expect(state()).toMatchObject({ status: 'idle', rangePlay: null, positionMs: 0, activeVerseId: null });
    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(fakePlaylist().skipTo).toHaveBeenCalledTimes(1);
    expect(audio.createAudioPlaylist.mock.calls.length).toBe(playlists);
  });

  it('ends with the surah when the range runs to the last ayah of the surah, before the next surah plays', async () => {
    await playVerseRange('1:1', '1:2');
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 10, currentTime: 9.8 });
    expect(state().status).toBe('playing');

    fakePlaylist().emitTrackChanged(1);

    expect(state()).toMatchObject({ status: 'idle', rangePlay: null });
    expect(fakePlaylist().pause).toHaveBeenCalled();
    expect(fakePlaylist().currentIndex).toBe(1);
  });

  it('a surah change the system makes mid-surah (lock screen) clears the range and plays on', async () => {
    await playRangeTwoTwoToThree();
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 7 });

    fakePlaylist().emitTrackChanged(2);

    expect(state()).toMatchObject({ chapterId: 3, status: 'playing', rangePlay: null });
  });

  it('a pause and a resume keep the range', async () => {
    await playRangeTwoTwoToThree();
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 2 });

    pause();
    expect(state()).toMatchObject({ status: 'paused', rangePlay: RANGE_2_2_TO_2_3 });

    await resume();
    expect(state().rangePlay).toEqual(RANGE_2_2_TO_2_3);
  });

  it('a seek keeps the range', async () => {
    await playRangeTwoTwoToThree();

    seek(6_000);

    expect(state().rangePlay).toEqual(RANGE_2_2_TO_2_3);
  });

  it('waits for a repeat set during the range, and stops when the repeat has finished', async () => {
    await playRangeTwoTwoToThree();
    expect(setRepeat({ fromVerseId: 9, toVerseId: 10, count: 3 })).toBe(true);

    // The first and second passes seek back to the range's start; the range keeps playing.
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 10.2 });
    await flush();
    expect(fakePlaylist().seekTo).toHaveBeenLastCalledWith(0);
    expect(state()).toMatchObject({ status: 'playing', rangePlay: RANGE_2_2_TO_2_3 });

    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 0.5 });
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 10.2 });
    await flush();
    expect(state()).toMatchObject({ status: 'playing', rangePlay: RANGE_2_2_TO_2_3 });

    // The last pass finishes the repeat; the range then ends too, at the same end.
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 0.5 });
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 10.2 });

    expect(state()).toMatchObject({ status: 'idle', rangePlay: null, repeat: null });
  });
});

describe('any other play clears the range', () => {
  it('a surah play', async () => {
    await playRangeTwoTwoToThree();

    await playChapter(1);

    expect(state().rangePlay).toBeNull();
  });

  it('a play from an ayah', async () => {
    await playRangeTwoTwoToThree();

    await playFromVerse('2:3');

    expect(state()).toMatchObject({ status: 'loading', rangePlay: null });
  });

  it('a play from an ayah the file does not record, which starts nothing', async () => {
    await playRangeTwoTwoToThree();

    await playFromVerse('2:1');

    expect(state().rangePlay).toBeNull();
  });

  it('the next ayah', async () => {
    await playRangeTwoTwoToThree();
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 2 });

    await nextAyah();

    expect(state().rangePlay).toBeNull();
  });

  it('a reciter switch while playing keeps the range when the new timings hold its ends', async () => {
    await playRangeTwoTwoToThree();
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 2 });

    await switchReciter(31);

    expect(state()).toMatchObject({ reciterId: 31, rangePlay: RANGE_2_2_TO_2_3 });
  });
});

describe('a verse range does not record a listen', () => {
  it('saves no listen while the range plays or when it stops', async () => {
    await playRangeTwoTwoToThree();
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 2 });
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 10.2 });

    expect(listRecentListens(10, { db: mockUser.executor ?? undefined })).toEqual([]);
  });

  it('a surah played normally still saves its listen', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 10, currentTime: 3 });

    expect(listRecentListens(10, { db: mockUser.executor ?? undefined })).toHaveLength(1);
  });
});

describe('a verse range that cannot play', () => {
  it('fails with no-timings when the file has no timings for its ends', async () => {
    executor.run('DELETE FROM recitation_timings WHERE audio_file_id = 100');

    await playVerseRange('1:1', '1:2');

    expect(state()).toMatchObject({ status: 'error', error: 'no-timings', rangePlay: null });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('fails with invalid-verse for an ayah the partial file does not record, and starts nothing', async () => {
    await playVerseRange('2:1', '2:3');
    expect(state()).toMatchObject({ status: 'error', error: 'invalid-verse' });

    await playVerseRange('2:3', '2:5');
    expect(state()).toMatchObject({ status: 'error', error: 'invalid-verse' });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('fails with invalid-verse for a range across surahs, or reversed', async () => {
    await playVerseRange('2:3', '1:1');
    expect(state()).toMatchObject({ status: 'error', error: 'invalid-verse' });

    await playVerseRange('2:4', '2:3');
    expect(state()).toMatchObject({ status: 'error', error: 'invalid-verse' });
    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
  });

  it('fails with surah-unavailable, and marks the surah, when the reciter has no file for it', async () => {
    setReciterId(31);

    await playVerseRange('3:1', '3:1');

    expect(state()).toMatchObject({ status: 'error', error: 'surah-unavailable', unavailable: { reciterId: 31, chapterId: 3 } });
  });

  it('fails with offline when the surah is not downloaded and the device is offline', async () => {
    useNetworkStatus.setState({ online: false, changedAt: Date.now() - ONLINE_DEBOUNCE_MS });

    await playVerseRange('1:1', '1:2');

    expect(state()).toMatchObject({ status: 'error', error: 'offline', rangePlay: null });
  });
});
