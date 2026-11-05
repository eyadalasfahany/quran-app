import { act, renderHook } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { openAudioTestDb } from '../data/test-db';
import { setReciterId } from '../settings';
import { usePlayerStore } from '../playerStore';

import { useMiniUnavailable } from './useMiniUnavailable';

// Placeholder reciters and the surah ids only: the notice's rule needs no ayah text.
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

let db: { executor: SqlExecutor; close: () => void };
const missing = { reciterId: 30, chapterId: 37 };

beforeEach(() => {
  db = openAudioTestDb();
  mockContent.executor = db.executor;
  // Reciter 30 has surah 1 only; reciter 31 has surah 1 too, so a switch to it is a real change of reciter.
  db.executor.run(`INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes, is_default) VALUES
     (30, 'chapter_recitations', 'Reciter A', 'قارئ أ', 1, 1000, 1),
     (31, 'chapter_recitations', 'Reciter B', 'قارئ ب', 1, 1000, 0)`);
  db.executor.run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, name, name_ar) VALUES
     (30, 'chapter_recitations', 1, 'a', 0, 'Reciter A', 'قارئ أ'),
     (31, 'chapter_recitations', 1, 'b', 0, 'Reciter B', 'قارئ ب')`);
  db.executor.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES
     (1, 30, 'Reciter A', 'قارئ أ', 'Murattal', 0),
     (2, 31, 'Reciter B', 'قارئ ب', 'Murattal', 0)`);
  db.executor.run(`INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/a-1.mp3', 48000, 'mp3'),
     (200, 2, 1, 'https://example.test/b-1.mp3', 48000, 'mp3')`);
  usePlayerStore.getState().reset();
  setReciterId(30);
  storage.set(storageKeys.readerLastVerseKey, '37:1');
});

afterEach(() => {
  db.close();
  mockContent.executor = null;
  storage.remove(storageKeys.readerLastVerseKey);
});

function raise(): void {
  usePlayerStore.getState().markUnavailable(missing);
}

describe('useMiniUnavailable', () => {
  it('returns the entry when the status, the reciter and the surah all match', async () => {
    raise();
    const { result } = await renderHook(() => useMiniUnavailable());

    expect(result.current).toEqual(missing);
  });

  it('returns null when nothing is unavailable', async () => {
    const { result } = await renderHook(() => useMiniUnavailable());

    expect(result.current).toBeNull();
  });

  it('returns null after the saved reciter changes', async () => {
    raise();
    const { result } = await renderHook(() => useMiniUnavailable());
    expect(result.current).toEqual(missing);

    await act(async () => {
      setReciterId(31);
    });

    expect(result.current).toBeNull();
  });

  it('returns null after the last-read ayah moves to another surah', async () => {
    raise();
    const { result } = await renderHook(() => useMiniUnavailable());
    expect(result.current).toEqual(missing);

    await act(async () => {
      storage.set(storageKeys.readerLastVerseKey, '1:1');
    });

    expect(result.current).toBeNull();
  });

  it('returns null after a new play begins', async () => {
    raise();
    const { result } = await renderHook(() => useMiniUnavailable());
    expect(result.current).toEqual(missing);

    await act(async () => {
      usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48000 });
    });

    expect(result.current).toBeNull();
  });

  it('returns null when the error is another code, even with a stale entry', async () => {
    raise();
    usePlayerStore.getState().markFailed('load-failed');
    const { result } = await renderHook(() => useMiniUnavailable());

    expect(result.current).toBeNull();
  });
});
