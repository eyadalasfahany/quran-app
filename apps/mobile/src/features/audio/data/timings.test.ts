import type { SqlExecutor } from '@/core/db/sql-executor';

import { parseSegments, timingsFitAudio, timingsFor, validTimings, type AyahTiming } from './timings';
import { openAudioTestDb } from './test-db';

const row = (verseId: number, startMs: number, endMs: number, segments: AyahTiming['segments'] = null): AyahTiming => ({
  endMs,
  segments,
  startMs,
  verseId,
});

let executor: SqlExecutor;
let close: () => void;

beforeEach(() => {
  ({ executor, close } = openAudioTestDb());
});

afterEach(() => {
  close();
});

// File 100 is surah 1 here, with two ayahs, so two timing rows cover it.
function insertFile(audioFileId: number, chapterId: number, versesCount: number) {
  executor.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end)
     VALUES (?, 'الفاتحة', 'Al-Fatihah', 'The Opener', 'makkah', 5, ?, 0, 1, 1)`,
    [chapterId, versesCount],
  );
  executor.run(
    "INSERT INTO chapter_audio_files (id, recitation_id, chapter_id, audio_url, size_bytes, duration_ms, format) VALUES (?, 1, ?, 'https://example.test/1.mp3', 1, 2000, 'mp3')",
    [audioFileId, chapterId],
  );
}

function insertTiming(audioFileId: number, verseId: number, startMs: number, endMs: number, segments: string | null = null) {
  executor.run(
    'INSERT INTO recitation_timings (audio_file_id, verse_id, start_ms, end_ms, segments) VALUES (?, ?, ?, ?, ?)',
    [audioFileId, verseId, startMs, endMs, segments],
  );
}

describe('validTimings', () => {
  it('returns rows sorted by start', () => {
    const sorted = validTimings([row(2, 1000, 2000), row(1, 0, 1000)]);
    expect(sorted.map((item) => item.verseId)).toEqual([1, 2]);
  });

  it('accepts touching ranges where next.start equals prev.end', () => {
    expect(validTimings([row(1, 0, 1000), row(2, 1000, 2000)])).toHaveLength(2);
  });

  it('rejects overlapping ranges', () => {
    expect(validTimings([row(1, 0, 1200), row(2, 1000, 2000)])).toEqual([]);
  });

  it('rejects a row whose start is not before its end', () => {
    expect(validTimings([row(1, 1000, 1000)])).toEqual([]);
    expect(validTimings([row(1, 2000, 1000)])).toEqual([]);
  });

  it('returns [] for no rows', () => {
    expect(validTimings([])).toEqual([]);
  });
});

describe('parseSegments', () => {
  it('parses a list of [position, start, end] triples', () => {
    expect(parseSegments('[[1,0,200],[2,200,400]]')).toEqual([
      [1, 0, 200],
      [2, 200, 400],
    ]);
  });

  it('maps null and malformed values to null', () => {
    expect(parseSegments(null)).toBeNull();
    expect(parseSegments('{')).toBeNull();
    expect(parseSegments('{"a":1}')).toBeNull();
    expect(parseSegments('[[1,0]]')).toBeNull();
    expect(parseSegments('[[1,"0",200]]')).toBeNull();
    expect(parseSegments('[[1,-1,200]]')).toBeNull();
  });
});

describe('timingsFor', () => {
  beforeEach(() => {
    insertFile(100, 1, 2);
  });

  it('returns rows sorted by start with parsed segments', () => {
    insertTiming(100, 2, 1000, 2000);
    insertTiming(100, 1, 0, 1000, '[[1,0,500]]');

    expect(timingsFor(executor, 100)).toEqual([
      { endMs: 1000, segments: [[1, 0, 500]], startMs: 0, verseId: 1 },
      { endMs: 2000, segments: null, startMs: 1000, verseId: 2 },
    ]);
  });

  it('turns a malformed segments value into null for that row only', () => {
    insertTiming(100, 1, 0, 1000, 'not json');
    insertTiming(100, 2, 1000, 2000, '[[1,0,300]]');

    const rows = timingsFor(executor, 100);
    expect(rows.map((item) => item.segments)).toEqual([null, [[1, 0, 300]]]);
  });

  it('returns [] when the file has overlapping timings', () => {
    insertTiming(100, 1, 0, 1200);
    insertTiming(100, 2, 1000, 2000);
    expect(timingsFor(executor, 100)).toEqual([]);
  });

  it('returns [] for a file with no timings', () => {
    expect(timingsFor(executor, 999)).toEqual([]);
  });

  it('returns [] when an ayah of the surah has no timing, so the highlight never stops partway', () => {
    insertTiming(100, 1, 0, 1000);

    expect(timingsFor(executor, 100)).toEqual([]);
  });

  it('returns [] when the file has no known surah', () => {
    insertTiming(200, 1, 0, 1000);
    insertTiming(200, 2, 1000, 2000);

    expect(timingsFor(executor, 200)).toEqual([]);
  });
});

describe('timingsFitAudio', () => {
  const timings = [row(1, 0, 5000), row(2, 5000, 600_000)];

  it('accepts timings that end with the audio, or a little after it', () => {
    expect(timingsFitAudio(timings, 600_000)).toBe(true);
    expect(timingsFitAudio(timings, 598_500)).toBe(true);
  });

  it('accepts a short tail after the last ayah: silence or a closing du\'a', () => {
    expect(timingsFitAudio(timings, 610_000)).toBe(true);
    expect(timingsFitAudio(timings, 630_000)).toBe(true);
  });

  it('rejects timings that end well after the audio', () => {
    expect(timingsFitAudio(timings, 590_000)).toBe(false);
  });

  it('rejects far more audio after the last ayah than a tail explains', () => {
    expect(timingsFitAudio(timings, 660_000)).toBe(false);
    expect(timingsFitAudio([row(1, 0, 20_000)], 40_000)).toBe(false);
  });

  it('accepts no timings and an unknown duration', () => {
    expect(timingsFitAudio([], 60_000)).toBe(true);
    expect(timingsFitAudio(timings, 0)).toBe(true);
  });
});
