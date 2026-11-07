import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import type { FakeAudioPlaylist } from '../../../jest/fake-audio-player';
import { openUserTestStore } from '../../../jest/user-test-db';
import { openAudioTestDb } from './data/test-db';
import { nextAyah, playChapter, playFromVerse, resetPlayerForTests, switchReciter } from './player';
import { usePlayerStore } from './playerStore';
import { useRangeNoticeStore } from './range-notice';
import { setReciterId } from './settings';

// Partial surahs (ADR 0077 amendment): a file that records only first_ayah..last_ayah of its surah.

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

const noticeShown = () => useRangeNoticeStore.getState().notice !== null;

/**
 * Reciter 30 (id 1) has: surah 1 whole (2 ayahs), surah 2 partial (5 ayahs, file records 2 to 4), surah 3 whole (1 ayah),
 * surah 4 partial and last (5 ayahs, file records 1 to 3). Reciter 31 (id 2) has surah 2 whole, as the QF-style baseline.
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
  close();
  userDatabase.close();
  mockContent.executor = null;
  mockUser.executor = null;
});

describe('starting an ayah of a partial surah', () => {
  it('plays an ayah inside the recorded range, from its own timing, with no notice', async () => {
    await playFromVerse('2:3');

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading' });
    expect(fakePlaylist().seekTo).toHaveBeenCalledWith(5);
    expect(noticeShown()).toBe(false);
  });

  it('does not play an ayah before the range, and shows the notice', async () => {
    usePlayerStore.getState().beginStarting({ kind: 'verse', verseKey: '2:1' });

    await playFromVerse('2:1');

    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', startingTarget: null, error: null });
    expect(noticeShown()).toBe(true);
  });

  it('does not play an ayah after the range, and shows the notice', async () => {
    await playFromVerse('2:5');

    expect(audio.createAudioPlaylist).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().status).toBe('idle');
    expect(noticeShown()).toBe(true);
  });

  it('leaves audio that is already playing alone when an unrecorded ayah is tapped', async () => {
    await playFromVerse('2:3');
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15 });

    await playFromVerse('2:5');

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'playing' });
    expect(noticeShown()).toBe(true);
  });

  it('highlights the recorded ayahs from the range timings', async () => {
    await playFromVerse('2:2');
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 6 });

    expect(usePlayerStore.getState().activeVerseId).toBe(10);
  });
});

describe('playing the surah from its start', () => {
  it('begins at the file start (the first recorded ayah) with the notice shown first', async () => {
    await playChapter(2);

    expect(noticeShown()).toBe(true);
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading' });
    expect(fakePlaylist().play).toHaveBeenCalled();
    expect(fakePlaylist().seekTo).not.toHaveBeenCalled();
  });

  it('shows no notice for a partial surah that starts at its first ayah', async () => {
    await playChapter(4);

    expect(noticeShown()).toBe(false);
  });

  it('shows no notice for a whole surah (null range)', async () => {
    await playChapter(1);

    expect(noticeShown()).toBe(false);
  });

  it('shows no notice when resuming a partial surah part-way', async () => {
    await playChapter(2, 7000);

    expect(noticeShown()).toBe(false);
  });
});

describe('continuous play across partial surahs', () => {
  it('shows the notice when the playlist reaches the end of a recorded range and moves on', async () => {
    // Surah 2 is index 1 of the playlist [1, 2, 3, 4].
    await playChapter(2, 7000);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 7 });
    expect(noticeShown()).toBe(false);

    fakePlaylist().emitTrackChanged(2);

    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 3, status: 'playing' });
    expect(noticeShown()).toBe(true);
  });

  it('shows the notice when the playlist advances into a partial surah that starts late', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 10 });

    fakePlaylist().emitTrackChanged(1);

    expect(usePlayerStore.getState().chapterId).toBe(2);
    expect(noticeShown()).toBe(true);
  });

  it('shows no notice between two whole surahs', async () => {
    await playChapter(1);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 10 });
    fakePlaylist().emitTrackChanged(1);
    useRangeNoticeStore.getState().clear();
    await playChapter(3);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 5 });
    expect(noticeShown()).toBe(false);
  });

  it('nextAyah past the last recorded ayah shows the notice and moves to the next surah', async () => {
    await playChapter(2, 11000);
    fakePlaylist().currentTime = 11;
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 11 });

    await nextAyah();

    expect(usePlayerStore.getState().chapterId).toBe(3);
    expect(noticeShown()).toBe(true);
  });

  it('shows the notice, then stops, when a partial file is the last one and ends', async () => {
    await playChapter(4);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 1 });
    expect(noticeShown()).toBe(false);

    fakePlaylist().emitStatus({ playing: false, isLoaded: true, duration: 15, currentTime: 15, didJustFinish: true });

    expect(usePlayerStore.getState().status).toBe('idle');
    expect(noticeShown()).toBe(true);
  });

  it('shows no notice when a whole last file ends', async () => {
    executor.run('UPDATE chapter_audio_files SET first_ayah = NULL, last_ayah = NULL WHERE id = 400');
    executor.run(`INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES (400, 17, 15000, 16000)`);
    await playChapter(3);
    fakePlaylist().emitTrackChanged(3);
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 15, currentTime: 1 });
    fakePlaylist().emitStatus({ playing: false, isLoaded: true, duration: 15, currentTime: 15, didJustFinish: true });

    expect(usePlayerStore.getState().status).toBe('idle');
    expect(noticeShown()).toBe(false);
  });
});

describe('a file with no range (QF and MP3Quran)', () => {
  it('plays any ayah and never shows the notice', async () => {
    setReciterId(31);

    await playFromVerse('2:1');
    expect(usePlayerStore.getState()).toMatchObject({ chapterId: 2, status: 'loading' });
    await playFromVerse('2:5');

    expect(noticeShown()).toBe(false);
  });
});

describe('switching reciter onto a partial surah', () => {
  it('starts from the file start with the notice when the kept ayah is not recorded', async () => {
    setReciterId(31);
    await playFromVerse('2:5');
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 25, currentTime: 21 });
    expect(usePlayerStore.getState().activeVerseId).toBe(12);

    await switchReciter(30);

    expect(usePlayerStore.getState()).toMatchObject({ reciterId: 30, chapterId: 2 });
    expect(usePlayerStore.getState().activeVerseId).not.toBe(12);
    expect(noticeShown()).toBe(true);
  });

  it('keeps the ayah, with no notice, when it is recorded', async () => {
    setReciterId(31);
    await playFromVerse('2:3');
    fakePlaylist().emitStatus({ playing: true, isLoaded: true, duration: 25, currentTime: 11 });

    await switchReciter(30);

    expect(noticeShown()).toBe(false);
  });
});
