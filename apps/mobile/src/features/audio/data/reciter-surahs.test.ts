import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAudioTestDb } from './test-db';
import { reciterSurahs } from './reciter-surahs';

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  executor.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end) VALUES
     (1, 'الفاتحة', 'Al-Fatihah', 'The Opener', 'makkah', 5, 7, 0, 1, 1),
     (2, 'البقرة', 'Al-Baqarah', 'The Cow', 'madinah', 87, 286, 1, 2, 49),
     (3, 'آل عمران', 'Ali Imran', 'Family of Imran', 'madinah', 89, 200, 1, 50, 76)`,
  );
  executor.run(
    `INSERT INTO recitations (id, resource_id, reciter_name, reciter_name_ar, style, has_word_segments) VALUES (1, 30, 'Mishari', 'مشاري', 'Murattal', 1)`,
  );
  executor.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
     (100, 1, 3, 'https://example.test/3.mp3', NULL, 1000, 'mp3'),
     (101, 1, 1, 'https://example.test/1.mp3', NULL, 1000, 'mp3')`,
  );
});

afterEach(() => {
  close();
});

describe('reciterSurahs', () => {
  it('lists every surah in order, flags the ones with no audio, and counts the ones with audio', () => {
    const result = reciterSurahs(executor, 30);

    expect(result.surahs.map((chapter) => chapter.id)).toEqual([1, 2, 3]);
    expect(result.surahs.map((chapter) => chapter.available)).toEqual([true, false, true]);
    expect(result.surahs[0]).toMatchObject({ nameArabic: 'الفاتحة', nameSimple: 'Al-Fatihah', available: true });
    expect(result.total).toBe(2);
  });

  it('keeps the whole Quran as the total before the pack is installed, and lists no surahs', () => {
    expect(reciterSurahs(executor, 99)).toEqual({ surahs: [], total: 3 });
  });

  describe('with the whole Quran', () => {
    beforeEach(() => {
      // Replace the three-surah fixture with all 114 surahs; the reciter has every surah except 37.
      executor.run('DELETE FROM chapter_audio_files');
      executor.run('DELETE FROM chapters');
      for (let id = 1; id <= 114; id += 1) {
        executor.run(
          `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end)
           VALUES (?, ?, ?, ?, 'makkah', ?, 1, 0, 1, 1)`,
          [id, `سورة ${id}`, `Surah ${id}`, `Surah ${id}`, id],
        );
        if (id !== 37) {
          executor.run(
            `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format)
             VALUES (?, 1, ?, ?, NULL, 1000, 'mp3')`,
            [1000 + id, id, `https://example.test/${id}.mp3`],
          );
        }
      }
    });

    it('lists all 114 surahs, with 37 flagged unavailable', () => {
      const result = reciterSurahs(executor, 30);

      expect(result.surahs).toHaveLength(114);
      expect(result.surahs.find((chapter) => chapter.id === 36)?.available).toBe(true);
      expect(result.surahs.find((chapter) => chapter.id === 37)?.available).toBe(false);
      expect(result.surahs.find((chapter) => chapter.id === 38)?.available).toBe(true);
    });

    it('counts total as the surahs with audio', () => {
      expect(reciterSurahs(executor, 30).total).toBe(113);
    });

    it('is empty and keeps the 114 total before the pack is installed', () => {
      expect(reciterSurahs(executor, 99)).toEqual({ surahs: [], total: 114 });
    });
  });
});
