import type { SqlExecutor } from '@/core/db/sql-executor';

import { availabilityForReciters, availableChapterIds, surahAvailability } from './surah-availability';
import { openAudioTestDb } from './test-db';

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  executor.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (36, 'يس', 'Ya-Sin', 'Ya Sin', 'makkah', 41, 83, 0, 440, 440),
     (37, 'الصافات', 'As-Saffat', 'The Ranks', 'makkah', 56, 182, 0, 446, 446),
     (38, 'ص', 'Sad', 'Sad', 'makkah', 38, 88, 0, 453, 453)`,
  );
  // Resource 30 has a recitation with rows for 36 and 38 only.
  executor.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES
     (1, 30, 'Reciter A', 'قارئ أ', 'Murattal', 0),
     (2, 31, 'Reciter B', 'قارئ ب', 'Murattal', 0),
     (3, 32, 'Reciter C', 'قارئ ج', 'Murattal', 0)`,
  );
  executor.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
     (100, 1, 36, 'https://example.test/36.mp3', NULL, 1000, 'mp3'),
     (101, 1, 38, 'https://example.test/38.mp3', NULL, 1000, 'mp3')`,
  );
});

afterEach(() => {
  close();
});

describe('surahAvailability', () => {
  it('is available when the pack has a row for the surah', () => {
    expect(surahAvailability(executor, 30, 36)).toBe('available');
  });

  it('is unavailable when the pack has rows but none for the surah', () => {
    expect(surahAvailability(executor, 30, 37)).toBe('unavailable');
  });

  it('is unknown when the reciter has no recitations row', () => {
    expect(surahAvailability(executor, 99, 36)).toBe('unknown');
  });

  it('is unknown when the recitation has zero rows', () => {
    executor.run(`DELETE FROM chapter_audio_files WHERE recitation_id = 3`);
    executor.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES (4, 33, 'Reciter D', 'قارئ د', 'Murattal', 0)`);

    expect(surahAvailability(executor, 33, 36)).toBe('unknown');
  });
});

describe('availableChapterIds', () => {
  it('returns the set of surahs the reciter has a file for, and null when not installed', () => {
    const ids = availableChapterIds(executor, 30);

    expect(ids).toEqual(new Set([36, 38]));
    expect(availableChapterIds(executor, 99)).toBeNull();
  });

  it('returns null when the recitation exists but has zero rows', () => {
    expect(availableChapterIds(executor, 32)).toBeNull();
  });
});

describe('availabilityForReciters', () => {
  it('answers several reciters in one call and maps a missing resource id to unknown', () => {
    const result = availabilityForReciters(executor, [30, 31, 32, 99], 37);

    expect(result).toEqual({ 30: 'unavailable', 31: 'unknown', 32: 'unknown', 99: 'unknown' });
  });

  it('marks a reciter with the surah as available', () => {
    expect(availabilityForReciters(executor, [30], 36)).toEqual({ 30: 'available' });
  });

  it('returns an empty record for no reciters', () => {
    expect(availabilityForReciters(executor, [], 36)).toEqual({});
  });
});
