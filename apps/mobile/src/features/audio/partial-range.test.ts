import { endsEarly, isAyahRecorded, recordedRange, startsLate } from './partial-range';

describe('partial range helpers', () => {
  it('reads no range for a whole surah or no file', () => {
    expect(recordedRange({ firstAyah: null, lastAyah: null })).toBeNull();
    expect(recordedRange(undefined)).toBeNull();
  });

  it('reads the range of a partial surah', () => {
    expect(recordedRange({ firstAyah: 2, lastAyah: 9 })).toEqual({ first: 2, last: 9 });
  });

  it('records every ayah of a whole surah and only the range of a partial one', () => {
    const range = { first: 2, last: 4 };
    expect(isAyahRecorded(null, 100)).toBe(true);
    expect([1, 2, 3, 4, 5].map((ayah) => isAyahRecorded(range, ayah))).toEqual([false, true, true, true, false]);
  });

  it('tells whether a file starts late or ends early', () => {
    expect(startsLate({ first: 2, last: 4 })).toBe(true);
    expect(startsLate({ first: 1, last: 4 })).toBe(false);
    expect(startsLate(null)).toBe(false);
    expect(endsEarly({ first: 1, last: 4 }, 5)).toBe(true);
    expect(endsEarly({ first: 1, last: 5 }, 5)).toBe(false);
    expect(endsEarly(null, 5)).toBe(false);
  });
});
