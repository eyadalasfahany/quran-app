import type { SqlExecutor } from '@/core/db/sql-executor';

import { chapterAudio } from './audio-files';
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
    });
  });

  it('keeps a null size', () => {
    expect(chapterAudio(executor, 1, 2)?.sizeBytes).toBeNull();
  });

  it('returns undefined for a missing surah or recitation', () => {
    expect(chapterAudio(executor, 1, 3)).toBeUndefined();
    expect(chapterAudio(executor, 2, 1)).toBeUndefined();
  });
});
