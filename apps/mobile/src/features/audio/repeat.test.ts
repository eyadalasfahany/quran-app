import type { AyahTiming } from './data/timings';
import { isRepeatRangeValid, repeatAction, repeatContainsPosition, repeatContainsVerse, REPEAT_COUNTS, type RepeatRange } from './repeat';

// Three ayahs with a gap after the second. Verse ids are global, as in content.db.
const timings: AyahTiming[] = [
  { verseId: 10, startMs: 1000, endMs: 3000, segments: null },
  { verseId: 11, startMs: 3000, endMs: 6000, segments: null },
  { verseId: 12, startMs: 7000, endMs: 9000, segments: null },
];

const range = (overrides: Partial<RepeatRange> = {}): RepeatRange => ({
  fromVerseId: 10,
  toVerseId: 11,
  count: 3,
  done: 0,
  ...overrides,
});

describe('repeatAction', () => {
  it('does nothing without a repeat', () => {
    expect(repeatAction(null, timings, 5999)).toBe('none');
  });

  it('does nothing before the end of the last ayah, less the tolerance', () => {
    expect(repeatAction(range(), timings, 5949)).toBe('none');
    expect(repeatAction(range(), timings, 0)).toBe('none');
  });

  it('seeks back to the range start at the tolerance boundary (endMs - 50)', () => {
    expect(repeatAction(range(), timings, 5950)).toEqual({ seekTo: 1000 });
  });

  it('seeks back at and after the end of the last ayah', () => {
    expect(repeatAction(range(), timings, 6000)).toEqual({ seekTo: 1000 });
    expect(repeatAction(range(), timings, 6400)).toEqual({ seekTo: 1000 });
  });

  it('keeps seeking while done + 1 is below the count, then finishes at the boundary', () => {
    expect(repeatAction(range({ count: 3, done: 0 }), timings, 6000)).toEqual({ seekTo: 1000 });
    expect(repeatAction(range({ count: 3, done: 1 }), timings, 6000)).toEqual({ seekTo: 1000 });
    expect(repeatAction(range({ count: 3, done: 2 }), timings, 6000)).toBe('finish');
  });

  it('plays the range once and continues for count 1', () => {
    expect(repeatAction(range({ count: 1, done: 0 }), timings, 6000)).toBe('finish');
  });

  it('never finishes for Infinity', () => {
    expect(repeatAction(range({ count: Infinity, done: 0 }), timings, 6000)).toEqual({ seekTo: 1000 });
    expect(repeatAction(range({ count: Infinity, done: 1_000_000 }), timings, 6000)).toEqual({ seekTo: 1000 });
  });

  it('returns none when the from or to timing is missing', () => {
    expect(repeatAction(range({ fromVerseId: 99 }), timings, 6000)).toBe('none');
    expect(repeatAction(range({ toVerseId: 99 }), timings, 6000)).toBe('none');
    expect(repeatAction(range(), [], 6000)).toBe('none');
  });

  it('repeats a single ayah from its own start', () => {
    expect(repeatAction(range({ fromVerseId: 12, toVerseId: 12 }), timings, 8950)).toEqual({ seekTo: 7000 });
  });
});

describe('isRepeatRangeValid', () => {
  it('accepts the offered counts, with from at or before to, both in the timings', () => {
    for (const count of REPEAT_COUNTS) {
      expect(isRepeatRangeValid({ fromVerseId: 10, toVerseId: 12, count }, timings)).toBe(true);
    }
    expect(isRepeatRangeValid({ fromVerseId: 11, toVerseId: 11, count: 1 }, timings)).toBe(true);
  });

  it('rejects a from after to, an ayah outside the timings, and counts the control does not offer', () => {
    expect(isRepeatRangeValid({ fromVerseId: 11, toVerseId: 10, count: 3 }, timings)).toBe(false);
    expect(isRepeatRangeValid({ fromVerseId: 10, toVerseId: 99, count: 3 }, timings)).toBe(false);
    expect(isRepeatRangeValid({ fromVerseId: 99, toVerseId: 10, count: 3 }, timings)).toBe(false);
    expect(isRepeatRangeValid({ fromVerseId: 10, toVerseId: 11, count: 2 }, timings)).toBe(false);
    expect(isRepeatRangeValid({ fromVerseId: 10, toVerseId: 11, count: 0 }, timings)).toBe(false);
  });

  it('rejects every range when there are no timings', () => {
    expect(isRepeatRangeValid({ fromVerseId: 10, toVerseId: 10, count: 1 }, [])).toBe(false);
  });
});

describe('range membership', () => {
  it('contains the ayahs from the first to the last, both ends included', () => {
    expect(repeatContainsVerse(range({ fromVerseId: 10, toVerseId: 11 }), timings, 10)).toBe(true);
    expect(repeatContainsVerse(range({ fromVerseId: 10, toVerseId: 11 }), timings, 11)).toBe(true);
    expect(repeatContainsVerse(range({ fromVerseId: 10, toVerseId: 11 }), timings, 12)).toBe(false);
    expect(repeatContainsVerse(range({ fromVerseId: 11, toVerseId: 12 }), timings, 10)).toBe(false);
  });

  it('contains the positions from the first start to the last end', () => {
    const repeat = range({ fromVerseId: 10, toVerseId: 11 });
    expect(repeatContainsPosition(repeat, timings, 1000)).toBe(true);
    expect(repeatContainsPosition(repeat, timings, 6000)).toBe(true);
    expect(repeatContainsPosition(repeat, timings, 999)).toBe(false);
    expect(repeatContainsPosition(repeat, timings, 6001)).toBe(false);
    expect(repeatContainsPosition(range({ fromVerseId: 99 }), timings, 2000)).toBe(false);
  });
});
