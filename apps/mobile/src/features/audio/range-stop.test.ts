import type { AyahTiming } from './data/timings';
import { isRangeInTimings, rangeStopAction, RANGE_STOP_LAG_MS, type RangePlay } from './range-stop';

// Fixture timings only (no Quran text): three ayahs of one surah, touching each other.
const timings: AyahTiming[] = [
  { verseId: 1, startMs: 0, endMs: 5_000, segments: null },
  { verseId: 2, startMs: 5_000, endMs: 10_000, segments: null },
  { verseId: 3, startMs: 10_000, endMs: 15_000, segments: null },
];

const range: RangePlay = { chapterId: 2, fromVerseId: 1, toVerseId: 2 };

describe('rangeStopAction', () => {
  it('keeps playing before the end of the range', () => {
    expect(rangeStopAction(range, timings, 0)).toBe('none');
    expect(rangeStopAction(range, timings, 9_000)).toBe('none');
    expect(rangeStopAction(range, timings, 10_000 + RANGE_STOP_LAG_MS - 1)).toBe('none');
  });

  it('stops once the decoded position is past the end of the last ayah by the lag', () => {
    expect(rangeStopAction(range, timings, 10_000 + RANGE_STOP_LAG_MS)).toBe('stop');
    expect(rangeStopAction(range, timings, 10_500)).toBe('stop');
  });

  it('stops at the end of a single-ayah range', () => {
    const single: RangePlay = { chapterId: 2, fromVerseId: 2, toVerseId: 2 };
    expect(rangeStopAction(single, timings, 9_999)).toBe('none');
    expect(rangeStopAction(single, timings, 10_000 + RANGE_STOP_LAG_MS)).toBe('stop');
  });

  it('stops at the end of the last ayah of the surah, which is the file end', () => {
    const lastOfSurah: RangePlay = { chapterId: 2, fromVerseId: 3, toVerseId: 3 };
    expect(rangeStopAction(lastOfSurah, timings, 14_900)).toBe('none');
    expect(rangeStopAction(lastOfSurah, timings, 15_000 + RANGE_STOP_LAG_MS)).toBe('stop');
  });

  it('never stops without a range', () => {
    expect(rangeStopAction(null, timings, 99_999)).toBe('none');
  });

  it('never stops when the range end has no timing', () => {
    const missing: RangePlay = { chapterId: 2, fromVerseId: 1, toVerseId: 99 };
    expect(rangeStopAction(missing, timings, 99_999)).toBe('none');
  });

  it('never stops with no timings at all', () => {
    expect(rangeStopAction(range, [], 99_999)).toBe('none');
  });
});

describe('isRangeInTimings', () => {
  it('is true when both ends are in order', () => {
    expect(isRangeInTimings(range, timings)).toBe(true);
    expect(isRangeInTimings({ chapterId: 2, fromVerseId: 2, toVerseId: 2 }, timings)).toBe(true);
  });

  it('is false when an end is missing or the range is reversed', () => {
    expect(isRangeInTimings({ chapterId: 2, fromVerseId: 1, toVerseId: 99 }, timings)).toBe(false);
    expect(isRangeInTimings({ chapterId: 2, fromVerseId: 99, toVerseId: 1 }, timings)).toBe(false);
    expect(isRangeInTimings({ chapterId: 2, fromVerseId: 3, toVerseId: 1 }, timings)).toBe(false);
    expect(isRangeInTimings(range, [])).toBe(false);
  });
});
