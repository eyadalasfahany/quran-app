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
  it('lists the surahs the reciter has audio for, in surah order, and the Quran total', () => {
    const result = reciterSurahs(executor, 30);

    expect(result.surahs.map((chapter) => chapter.id)).toEqual([1, 3]);
    expect(result.surahs[0]).toMatchObject({ nameArabic: 'الفاتحة', nameSimple: 'Al-Fatihah' });
    expect(result.total).toBe(3);
  });

  it('lists no surahs before the pack is installed, but still gives the total', () => {
    expect(reciterSurahs(executor, 99)).toEqual({ surahs: [], total: 3 });
  });
});
