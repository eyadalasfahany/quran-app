import { act, renderHook } from '@testing-library/react-native';

import { openContentDb } from '@/core/db/content/open';

import { openAudioTestDb } from '../data/test-db';
import { useReciterDownloads } from '../reciter-downloads';
import {
  useAvailableChapterIds,
  useReciterAvailabilityForSurah,
  useSurahAvailability,
} from './useReciterSurahAvailability';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));

const open = jest.mocked(openContentDb);

let executor: ReturnType<typeof openAudioTestDb>['executor'];
let close: () => void;

// Renders a hook and returns its current value.
async function read<T>(hook: () => T): Promise<T> {
  return (await renderHook(hook)).result.current;
}

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  executor.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (36, 'يس', 'Ya-Sin', 'Ya Sin', 'makkah', 41, 83, 0, 440, 440),
     (37, 'الصافات', 'As-Saffat', 'The Ranks', 'makkah', 56, 182, 0, 446, 446)`,
  );
  executor.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES
     (1, 30, 'Reciter A', 'قارئ أ', 'Murattal', 0),
     (2, 31, 'Reciter B', 'قارئ ب', 'Murattal', 0)`,
  );
  // Resource 30 has rows for 36 only; resource 31 is installed with no rows at all; 99 is not installed.
  executor.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
     (100, 1, 36, 'https://example.test/36.mp3', NULL, 1000, 'mp3')`,
  );
  open.mockReset();
  open.mockReturnValue({ executor } as unknown as ReturnType<typeof openContentDb>);
  useReciterDownloads.setState({ installedVersion: 0 });
});

afterEach(() => {
  close();
});

describe('useSurahAvailability', () => {
  it('reports available, unavailable and unknown for an installed, a missing-row and a not-installed reciter', async () => {
    expect(await read(() => useSurahAvailability(30, 36))).toBe('available');
    expect(await read(() => useSurahAvailability(30, 37))).toBe('unavailable');
    expect(await read(() => useSurahAvailability(99, 36))).toBe('unknown');
  });

  it('re-reads after a pack installs, flipping unknown to available', async () => {
    const view = await renderHook(() => useSurahAvailability(31, 36));
    expect(view.result.current).toBe('unknown');

    executor.run(
      `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
       (101, 2, 36, 'https://example.test/b36.mp3', NULL, 1000, 'mp3')`,
    );
    await act(async () => {
      useReciterDownloads.setState({ installedVersion: 1 });
    });

    expect(view.result.current).toBe('available');
  });

  it("returns 'unknown' for null inputs", async () => {
    expect(await read(() => useSurahAvailability(null, 36))).toBe('unknown');
    expect(await read(() => useSurahAvailability(30, null))).toBe('unknown');
  });

  it("returns 'unknown' when the content database cannot be opened", async () => {
    open.mockImplementation(() => {
      throw new Error('content database is not open');
    });

    expect(await read(() => useSurahAvailability(30, 36))).toBe('unknown');
  });
});

describe('useAvailableChapterIds', () => {
  it('returns the set for an installed reciter and null for one that is not installed', async () => {
    expect(await read(() => useAvailableChapterIds(30))).toEqual(new Set([36]));
    expect(await read(() => useAvailableChapterIds(99))).toBeNull();
  });

  it('returns null for a null input and when the database cannot be opened', async () => {
    expect(await read(() => useAvailableChapterIds(null))).toBeNull();

    open.mockImplementation(() => {
      throw new Error('content database is not open');
    });
    expect(await read(() => useAvailableChapterIds(30))).toBeNull();
  });
});

describe('useReciterAvailabilityForSurah', () => {
  it('answers each reciter for one surah, and re-reads after an install', async () => {
    const view = await renderHook(() => useReciterAvailabilityForSurah([30, 31, 99], 36));
    expect(view.result.current).toEqual({ 30: 'available', 31: 'unknown', 99: 'unknown' });

    executor.run(
      `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
       (101, 2, 37, 'https://example.test/b37.mp3', NULL, 1000, 'mp3')`,
    );
    await act(async () => {
      useReciterDownloads.setState({ installedVersion: 1 });
    });

    expect(view.result.current).toEqual({ 30: 'available', 31: 'unavailable', 99: 'unknown' });
  });

  it("returns 'unknown' for every reciter when the surah is null or the database cannot be opened", async () => {
    expect(await read(() => useReciterAvailabilityForSurah([30, 31], null))).toEqual({
      30: 'unknown',
      31: 'unknown',
    });

    open.mockImplementation(() => {
      throw new Error('content database is not open');
    });
    expect(await read(() => useReciterAvailabilityForSurah([30], 36))).toEqual({ 30: 'unknown' });
  });
});
