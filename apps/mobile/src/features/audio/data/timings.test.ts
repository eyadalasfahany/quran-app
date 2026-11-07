import type { SqlExecutor } from '@/core/db/sql-executor';

import { activeTimingIndex, activeWordPosition } from '../active-ayah';
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

describe('timingsFor on a partial surah (ADR 0077 amendment)', () => {
  it('accepts one timing per recorded ayah and refuses a count that misses the range', () => {
    insertFile(100, 1, 5);
    executor.run('UPDATE chapter_audio_files SET first_ayah = 2, last_ayah = 4 WHERE id = 100');
    insertTiming(100, 2, 0, 1000);
    insertTiming(100, 3, 1000, 2000);
    expect(timingsFor(executor, 100)).toEqual([]);

    insertTiming(100, 4, 2000, 3000);
    expect(timingsFor(executor, 100).map((timing) => timing.verseId)).toEqual([2, 3, 4]);

    insertTiming(100, 5, 3000, 4000);
    expect(timingsFor(executor, 100)).toEqual([]);
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

describe('generated Taybah timings', () => {
  // Placeholder surah 300 (chapter 3 here) with four ayahs, shaped like the API's generated rows: ayah 2 has no
  // segments (its verse does not match the QF word count), ayah 3 repeats positions 2 and 3.
  beforeEach(() => {
    insertFile(300, 3, 4);
    insertTiming(300, 1, 0, 150_000, '[[1,0,50000],[2,50000,100000],[3,100000,150000]]');
    insertTiming(300, 2, 150_000, 300_000, null);
    insertTiming(300, 3, 300_000, 450_000, '[[1,300000,330000],[2,330000,360000],[3,360000,390000],[2,390000,420000],[3,420000,450000]]');
    insertTiming(300, 4, 450_000, 600_000, '[[1,450000,500000],[2,500000,600000]]');
  });

  it('returns the four rows sorted by start with the segments parsed, nulls kept, repeats kept', () => {
    const rows = timingsFor(executor, 300);

    expect(rows).toEqual([
      { endMs: 150_000, segments: [[1, 0, 50_000], [2, 50_000, 100_000], [3, 100_000, 150_000]], startMs: 0, verseId: 1 },
      { endMs: 300_000, segments: null, startMs: 150_000, verseId: 2 },
      {
        endMs: 450_000,
        segments: [[1, 300_000, 330_000], [2, 330_000, 360_000], [3, 360_000, 390_000], [2, 390_000, 420_000], [3, 420_000, 450_000]],
        startMs: 300_000,
        verseId: 3,
      },
      { endMs: 600_000, segments: [[1, 450_000, 500_000], [2, 500_000, 600_000]], startMs: 450_000, verseId: 4 },
    ]);
  });

  it('fits a 600 s file and rejects a 700 s file with more than 5% of tail', () => {
    const rows = timingsFor(executor, 300);

    expect(timingsFitAudio(rows, 600_000)).toBe(true);
    expect(timingsFitAudio(rows, 700_000)).toBe(false);
  });

  it('highlights the repeated word positions in ayah 3 and the ayah index', () => {
    const rows = timingsFor(executor, 300);
    const ayahThree = rows[2];

    expect(ayahThree).toBeDefined();
    if (ayahThree === undefined) {
      return;
    }
    expect(activeWordPosition(ayahThree, 345_000)).toBe(2);
    expect(activeWordPosition(ayahThree, 400_000)).toBe(2);
    expect(activeWordPosition(ayahThree, 440_000)).toBe(3);
    expect(activeTimingIndex(rows, 400_000)).toBe(2);
  });

  it('has no word highlight in ayah 2 at any time', () => {
    const ayahTwo = timingsFor(executor, 300)[1];

    expect(ayahTwo).toBeDefined();
    if (ayahTwo === undefined) {
      return;
    }
    expect(activeWordPosition(ayahTwo, 160_000)).toBeNull();
    expect(activeWordPosition(ayahTwo, 250_000)).toBeNull();
    expect(activeWordPosition(ayahTwo, 299_000)).toBeNull();
  });
});
