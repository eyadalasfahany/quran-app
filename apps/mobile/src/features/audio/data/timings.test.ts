import type { SqlExecutor } from '@/core/db/sql-executor';

import { parseSegments, timingsFor, validTimings, type AyahTiming } from './timings';
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
});
