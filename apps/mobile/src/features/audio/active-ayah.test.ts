import type { AyahTiming } from './data/timings';
import { activeTimingIndex, activeWordPosition } from './active-ayah';

// Three ayahs with a gap after the second, and word segments that start before their ayah.
const timings: AyahTiming[] = [
  { verseId: 1, startMs: 0, endMs: 5000, segments: [[1, 0, 2000], [2, 2000, 4000], [3, 4000, 5000]] },
  { verseId: 2, startMs: 5000, endMs: 10000, segments: [[1, 4950, 6000], [2, 6000, 9000]] },
  { verseId: 3, startMs: 16000, endMs: 20000, segments: null },
];

describe('activeTimingIndex', () => {
  it('finds the ayah whose start is at or before the time, and holds until its end', () => {
    expect(activeTimingIndex(timings, 0)).toBe(0);
    expect(activeTimingIndex(timings, 4999)).toBe(0);
    expect(activeTimingIndex(timings, 5000)).toBe(1);
    expect(activeTimingIndex(timings, 9999)).toBe(1);
  });

  it('keeps the previous ayah in a gap', () => {
    expect(activeTimingIndex(timings, 10000)).toBe(1);
    expect(activeTimingIndex(timings, 15999)).toBe(1);
  });

  it('starts the next ayah exactly at its start after a gap', () => {
    expect(activeTimingIndex(timings, 16000)).toBe(2);
  });

  it('returns the last ayah at and after its end', () => {
    expect(activeTimingIndex(timings, 20000)).toBe(2);
    expect(activeTimingIndex(timings, 999_999)).toBe(2);
  });

  it('returns -1 before the first ayah', () => {
    const late: AyahTiming[] = [{ verseId: 9, startMs: 300, endMs: 900, segments: null }];
    expect(activeTimingIndex(late, 0)).toBe(-1);
    expect(activeTimingIndex(late, 299)).toBe(-1);
    expect(activeTimingIndex(late, 300)).toBe(0);
  });

  it('returns -1 for no timings, so there is no highlight', () => {
    expect(activeTimingIndex([], 1000)).toBe(-1);
  });

  it('handles a single ayah', () => {
    const one = [timings[0]!];
    expect(activeTimingIndex(one, 2500)).toBe(0);
    expect(activeTimingIndex(one, 5000)).toBe(0);
  });
});

describe('activeWordPosition', () => {
  it('returns the word whose segment holds the time, at its boundaries', () => {
    const first = timings[0]!;
    expect(activeWordPosition(first, 0)).toBe(1);
    expect(activeWordPosition(first, 1999)).toBe(1);
    expect(activeWordPosition(first, 2000)).toBe(2);
    expect(activeWordPosition(first, 4000)).toBe(3);
  });

  it('keeps the last word through the rest of the ayah', () => {
    expect(activeWordPosition(timings[0]!, 5000)).toBe(3);
  });

  it('finds the first word of an ayah whose first segment starts before the ayah', () => {
    const second = timings[1]!;
    // 4,950 is before the ayah start (5,000). Clamped to the ayah, the lookup finds word 1 at its start.
    expect(activeWordPosition(second, 5000)).toBe(1);
    expect(activeWordPosition(second, 6000)).toBe(2);
  });

  it('searches only its own ayah: the next ayah early segment does not leak into this one', () => {
    // Ayah 2's word 1 starts at 4,950, inside ayah 1's time. Ayah 1 still answers with its own word 3.
    expect(activeWordPosition(timings[0]!, 4960)).toBe(3);
  });

  it('returns null when the ayah has no segments, or an empty list', () => {
    expect(activeWordPosition(timings[2]!, 17000)).toBeNull();
    expect(activeWordPosition({ verseId: 4, startMs: 0, endMs: 10, segments: [] }, 5)).toBeNull();
  });
});
