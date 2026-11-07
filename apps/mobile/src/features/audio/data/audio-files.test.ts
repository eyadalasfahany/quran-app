import type { SqlExecutor } from '@/core/db/sql-executor';

import { chapterAudio, chapterIdsWithAudio } from './audio-files';
import { openAudioTestDb } from './test-db';

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
  executor.run(
    `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
     (100, 1, 1, 'https://example.test/1.mp3', 4096, 60000, 'mp3'),
     (101, 1, 2, 'https://example.test/2.mp3', NULL, 120000, 'mp3')`,
  );
});

afterEach(() => {
  close();
});

describe('chapterAudio', () => {
  it('returns the file for a recitation and surah', () => {
    expect(chapterAudio(executor, 1, 1)).toEqual({
      id: 100,
      url: 'https://example.test/1.mp3',
      durationMs: 60000,
      sizeBytes: 4096,
      format: 'mp3',
      firstAyah: null,
      lastAyah: null,
    });
  });

  it('reads the recorded ayah range of a partial surah', () => {
    executor.run('UPDATE chapter_audio_files SET first_ayah = 1, last_ayah = 22 WHERE id = 101');
    expect(chapterAudio(executor, 1, 2)).toMatchObject({ firstAyah: 1, lastAyah: 22 });
  });

  it('keeps a null size', () => {
    expect(chapterAudio(executor, 1, 2)?.sizeBytes).toBeNull();
  });

  it('returns undefined for a missing surah or recitation', () => {
    expect(chapterAudio(executor, 1, 3)).toBeUndefined();
    expect(chapterAudio(executor, 2, 1)).toBeUndefined();
  });
});

describe('chapterIdsWithAudio', () => {
  it('lists the surahs of one recitation that have a file, in surah order', () => {
    executor.run(
      `INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES
       (102, 1, 1, 'https://example.test/1b.mp3', NULL, 1000, 'mp3'),
       (103, 2, 5, 'https://example.test/5.mp3', NULL, 1000, 'mp3')`,
    );

    expect(chapterIdsWithAudio(executor, 1)).toEqual([1, 2]);
    expect(chapterIdsWithAudio(executor, 2)).toEqual([5]);
  });

  it('is empty for a recitation with no files', () => {
    expect(chapterIdsWithAudio(executor, 99)).toEqual([]);
  });
});
