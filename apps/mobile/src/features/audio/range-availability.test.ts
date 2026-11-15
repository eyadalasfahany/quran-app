import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAudioTestDb } from './data/test-db';
import { rangePlayability } from './range-availability';

// Fixture rows only: verse texts are placeholders, not Quran.

let executor: SqlExecutor;
let close: () => void;

/**
 * Reciter 30 (resource 30, recitation 1): surah 1 whole (file 100, timings for 1:1 and 1:2), surah 2 partial (file 200,
 * records 2 to 4, timings for 2:2 to 2:4), surah 3 with no timings (file 300 has none). Resource 31 (recitation 2) has
 * surah 2 whole with timings for 2:1 to 2:5. Resource 32 is installed as a catalogue row with no recitation.
 */
function seed(db: SqlExecutor): void {
  db.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opening', 'makkah', 5, 2, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 5, 1, 2, 49),
     (3, 'آل عمران', 'Ali', 'Family', 'madinah', 89, 1, 1, 50, 76)`,
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
     (13, '3:1', 3, 1, 1, 1, 1, 3, 'none', 'a', 'a')`,
  );
  for (const id of [30, 31, 32]) {
    db.run(`INSERT INTO catalog_resources (resource_id, "group", name, name_ar, version, pack_size_bytes) VALUES (${id}, 'chapter_recitations', 'R${id}', 'ق', 1, 1000)`);
  }
  db.run(`INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, has_word_segments) VALUES (1, 30, 'R30', 'ق', 1), (2, 31, 'R31', 'ق', 1)`);
  db.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, duration_ms, format, first_ayah, last_ayah) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 10000, 'mp3', NULL, NULL),
     (200, 1, 2, 'https://example.test/2.mp3', 15000, 'mp3', 2, 4),
     (300, 1, 3, 'https://example.test/3.mp3', 5000, 'mp3', NULL, NULL),
     (500, 2, 2, 'https://example.test/h2.mp3', 25000, 'mp3', NULL, NULL)`,
  );
  db.run(
    `INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms) VALUES
     (100, 1, 0, 5000), (100, 2, 5000, 10000),
     (200, 9, 0, 5000), (200, 10, 5000, 10000), (200, 11, 10000, 15000),
     (500, 8, 0, 5000), (500, 9, 5000, 10000), (500, 10, 10000, 15000), (500, 11, 15000, 20000), (500, 12, 20000, 25000)`,
  );
}

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  seed(executor);
});

afterEach(() => {
  close();
});

describe('rangePlayability', () => {
  it('is ok for a whole surah with timings for both ends', () => {
    expect(rangePlayability(executor, 30, '1:1', '1:2')).toBe('ok');
  });

  it('is ok for a partial surah when both ends are recorded and have timings', () => {
    expect(rangePlayability(executor, 30, '2:2', '2:4')).toBe('ok');
  });

  it('is not-installed when the reciter has no installed recitation (it installs on tap)', () => {
    expect(rangePlayability(executor, 32, '1:1', '1:2')).toBe('not-installed');
  });

  it('is no-reciter when there is no reciter at all', () => {
    expect(rangePlayability(executor, null, '1:1', '1:2')).toBe('no-reciter');
  });

  it('is surah-unavailable when the reciter has no file for the surah', () => {
    expect(rangePlayability(executor, 31, '3:1', '3:1')).toBe('surah-unavailable');
    expect(rangePlayability(executor, 30, '3:1', '3:1')).toBe('no-timings');
  });

  it('is no-timings when the file has none for the range, for example after the timings were dropped', () => {
    executor.run('DELETE FROM recitation_timings WHERE audio_file_id = 100');
    expect(rangePlayability(executor, 30, '1:1', '1:2')).toBe('no-timings');
  });

  it('is not-recorded when an end is outside the recorded part of a partial file', () => {
    expect(rangePlayability(executor, 30, '2:1', '2:3')).toBe('not-recorded');
    expect(rangePlayability(executor, 30, '2:4', '2:5')).toBe('not-recorded');
  });

  it('is invalid for an unknown verse, a range across surahs, or a reversed range', () => {
    expect(rangePlayability(executor, 30, '9:9', '9:9')).toBe('invalid');
    expect(rangePlayability(executor, 30, '1:2', '2:2')).toBe('invalid');
    expect(rangePlayability(executor, 30, '1:2', '1:1')).toBe('invalid');
  });
});
